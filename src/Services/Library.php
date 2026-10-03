<?php

namespace KBTech\FileManager\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use KBTech\FileManager\Models\Node;

class Library
{
    public function __construct(private Images $images, private Access $access) {}

    public function parent(?int $id, Authenticatable $user): ?Node
    {
        $parent = $id ? Node::findOrFail($id) : null;
        if ($parent) {
            abort_unless($parent->kind === 'folder', 422, 'Đích phải là thư mục.');
            $this->assertActive($parent);
        }
        $this->access->authorize($user, 'upload', $parent);
        return $parent;
    }

    public function assertActive(Node $node): void
    {
        $seen = [];
        while ($node) {
            abort_if($node->trashed() || isset($seen[$node->id]), 404);
            $seen[$node->id] = true;
            $node = $node->parent;
        }
    }

    public function name(string $name): string
    {
        $name = trim($name);
        if ($name === '' || in_array($name, ['.', '..']) || preg_match('/[\x00-\x1f\x7f\/\\\\]/u', $name)) {
            throw ValidationException::withMessages(['name' => 'Tên không được chứa dấu /, dấu \\ hoặc ký tự điều khiển.']);
        }
        return $name;
    }

    public function upload(UploadedFile $file, Authenticatable $user, ?Node $parent, string $visibility): Node
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $mime = $file->getMimeType();
        $types = config('file-manager.upload.types');
        if (! isset($types[$extension]) || ! in_array($mime, $types[$extension], true)) {
            throw ValidationException::withMessages(['files' => 'Loại file hoặc nội dung file không được cho phép.']);
        }
        $bytes = file_get_contents($file->getRealPath());
        return $this->store($bytes, [
            'parent_id' => $parent?->id, 'owner_id' => (string) $user->getAuthIdentifier(),
            'visibility' => $parent?->visibility ?? $visibility, 'name' => $this->name($file->getClientOriginalName()),
            'extension' => $extension, 'mime' => $mime,
        ]);
    }

    public function store(string $bytes, array $attributes): Node
    {
        $diskName = config('file-manager.disk');
        $disk = Storage::disk($diskName);
        $path = 'originals/'.date('Y/m').'/'.Str::uuid().'.'.$attributes['extension'];
        $thumbnailPath = null;
        $dimensions = [null, null];
        try {
            if (str_starts_with($attributes['mime'], 'image/')) {
                $dimensions = $this->images->dimensions($bytes);
                $thumbnail = $this->images->thumbnail($bytes);
                $thumbnailPath = 'thumbnails/'.Str::uuid().'.webp';
                if (! $disk->put($thumbnailPath, $thumbnail)) { throw new \RuntimeException('Không thể lưu thumbnail.'); }
            }
            if (! $disk->put($path, $bytes)) { throw new \RuntimeException('Không thể lưu file.'); }
            return DB::transaction(function () use ($bytes, $attributes, $diskName, $path, $thumbnailPath, $dimensions) {
                // Serializes quota checks across uploads on a dedicated database row lock.
                DB::table('fm_locks')->where('id', 1)->lockForUpdate()->first();
                if ($attributes['parent_id']) {
                    $parent = Node::findOrFail($attributes['parent_id']);
                    $this->assertActive($parent);
                    abort_unless($parent->visibility === $attributes['visibility'], 422, 'Chế độ thư mục đã thay đổi.');
                }
                $quota = config('file-manager.upload.quota_bytes');
                if ($quota && Node::withTrashed()->sum('size') + strlen($bytes) > $quota) {
                    throw ValidationException::withMessages(['files' => 'Thư viện đã vượt dung lượng lưu trữ.']);
                }
                return Node::create([
                    ...$attributes, 'kind' => 'file', 'disk' => $diskName, 'path' => $path,
                    'thumbnail_path' => $thumbnailPath, 'size' => strlen($bytes),
                    'width' => $dimensions[0], 'height' => $dimensions[1],
                ]);
            });
        } catch (\Throwable $e) {
            $disk->delete(array_filter([$path, $thumbnailPath]));
            throw $e;
        }
    }

    public function descendants(Node $node, bool $withTrashed = false): array
    {
        $ids = [$node->id]; $frontier = [$node->id];
        while ($frontier) {
            $query = $withTrashed ? Node::withTrashed() : Node::query();
            $frontier = $query->whereIn('parent_id', $frontier)->pluck('id')->diff($ids)->all();
            $ids = array_merge($ids, $frontier);
        }
        return $ids;
    }

    public function authorizeTree(Node $node, Authenticatable $user, string $ability, bool $withTrashed = false): array
    {
        $ids = $this->descendants($node, $withTrashed);
        foreach (Node::withTrashed()->whereIn('id', $ids)->get() as $child) { $this->access->authorize($user, $ability, $child); }
        return $ids;
    }

    public function trash(Node $node, Authenticatable $user): void
    {
        $ids = $this->authorizeTree($node, $user, 'delete');
        Node::whereIn('id', $ids)->update(['trash_batch' => (string) Str::uuid(), 'deleted_at' => now()]);
    }

    public function restore(Node $node, Authenticatable $user): void
    {
        $ids = $this->authorizeTree($node, $user, 'delete', true);
        if ($node->parent?->trashed()) {
            throw ValidationException::withMessages(['parent_id' => 'Hãy khôi phục thư mục cha trước.']);
        }
        $batch = $node->trash_batch;
        Node::withTrashed()->whereIn('id', $ids)->where('trash_batch', $batch)->update(['deleted_at' => null, 'trash_batch' => null]);
    }

    public function move(Node $node, ?Node $parent, Authenticatable $user): void
    {
        $ids = $this->authorizeTree($node, $user, 'update', true);
        if ($parent && in_array($parent->id, $ids)) {
            throw ValidationException::withMessages(['parent_id' => 'Không thể chuyển vào chính nó hoặc thư mục con.']);
        }
        // Scope changes must be explicit; a move cannot silently publish private files.
        if ($parent && $parent->visibility !== $node->visibility) {
            throw ValidationException::withMessages(['parent_id' => 'Thư mục đích phải cùng chế độ chung/riêng.']);
        }
        $node->update(['parent_id' => $parent?->id]);
    }

    public function purge(Node $node, Authenticatable $user): void
    {
        $ids = $this->authorizeTree($node, $user, 'delete', true);
        // Each record is removed only after its bytes. A failed disk operation
        // leaves the remaining trashed records available for a later retry.
        foreach (array_reverse($ids) as $id) {
            DB::transaction(function () use ($id) {
                $child = Node::withTrashed()->findOrFail($id);
                if ($child->kind === 'file') {
                    if (! Storage::disk($child->disk)->delete(array_filter([$child->path, $child->thumbnail_path]))) {
                        throw new \RuntimeException('Không thể xóa file trên ổ lưu trữ.');
                    }
                }
                $child->forceDelete();
            });
        }
    }
}
