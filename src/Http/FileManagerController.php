<?php

namespace KBTech\FileManager\Http;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use KBTech\FileManager\Models\Grant;
use KBTech\FileManager\Models\Node;
use KBTech\FileManager\Services\Access;
use KBTech\FileManager\Services\Images;
use KBTech\FileManager\Services\Library;

class FileManagerController extends Controller
{
    public function __construct(private Access $access, private Library $library, private Images $images) {}

    public function page(Request $request)
    {
        $this->access->authorize($request->user(), 'view');

        $isPicker = $request->boolean('picker');
        $standalone = $request->boolean('standalone') || $isPicker;
        $layout = $standalone ? null : config('file-manager.layout');
        $section = config('file-manager.section', 'content');

        return view('file-manager::index', [
            'layout' => $layout,
            'section' => $section,
            'embedded' => !empty($layout),
            'settings' => [
                'base' => url(config('file-manager.prefix')),
                'csrf' => csrf_token(),
                'brand' => config('file-manager.brand'),
                'user' => [
                    'id' => (string) $request->user()->getAuthIdentifier(),
                    'name' => $request->user()->name ?? 'Thành viên',
                ],
                'upload' => [
                    'maxKb' => config('file-manager.upload.max_kb'),
                    'maxFiles' => config('file-manager.upload.max_files'),
                    'extensions' => array_keys(config('file-manager.upload.types')),
                ],
                'quota' => config('file-manager.upload.quota_bytes'),
                'canUpload' => $this->access->allows($request->user(), 'upload'),
                'picker' => $isPicker,
                'multiple' => $request->boolean('multiple'),
                'channel' => substr((string) $request->query('channel', ''), 0, 100),
                'pickerType' => in_array($request->query('type'), ['image', 'video', 'document']) ? $request->query('type') : '',
            ],
        ]);
    }

    private function present(Node $node, Request $request): array
    {
        return [
            'id' => $node->id, 'parent_id' => $node->parent_id, 'name' => $node->name,
            'kind' => $node->kind, 'visibility' => $node->visibility, 'owner_id' => $node->owner_id,
            'mime' => $node->mime, 'extension' => $node->extension, 'size' => $node->size,
            'width' => $node->width, 'height' => $node->height,
            'url' => $node->kind === 'file' && ! $node->trashed() ? $node->url() : null,
            'thumbnail_url' => ! $node->trashed()
                ? ($node->thumbnail_path ? $node->url(true) : ($node->isImage() ? $node->url(false) : null))
                : null,
            'created_at' => $node->created_at->toIso8601String(), 'updated_at' => $node->updated_at->toIso8601String(),
            'deleted_at' => $node->deleted_at?->toIso8601String(),
            'permissions' => $this->access->permissions($request->user(), $node),
        ];
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'parent_id' => 'nullable|integer|min:1', 'q' => 'nullable|string|max:100',
            'scope' => ['nullable', Rule::in(['all', 'shared', 'private', 'recent', 'trash'])],
            'type' => ['nullable', Rule::in(['image', 'video', 'document', 'archive'])],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'name', 'size'])],
            'page' => 'nullable|integer|min:1', 'per_page' => 'nullable|integer|min:1|max:100',
        ]);
        $trash = ($data['scope'] ?? '') === 'trash';
        $query = $trash ? Node::onlyTrashed() : Node::query();
        $parent = ! empty($data['parent_id']) ? Node::findOrFail($data['parent_id']) : null;
        if ($parent) { $this->access->authorize($request->user(), 'view', $parent); }
        if (! empty($data['q'])) {
            // Literal wildcard escaping is portable across supported SQL drivers.
            $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $data['q']);
            $query->whereRaw("name LIKE ? ESCAPE '!'", ['%'.$escaped.'%']);
        } elseif (! $trash && ($data['scope'] ?? 'all') !== 'recent') {
            // Khi lọc theo loại tài nguyên ở thư mục gốc, tìm kiếm trên toàn bộ thư viện
            if (empty($data['type']) || ! empty($data['parent_id'])) {
                $query->where('parent_id', $parent?->id);
            }
        }
        if (in_array($data['scope'] ?? '', ['shared', 'private'])) { $query->where('visibility', $data['scope']); }
        if (($data['scope'] ?? '') === 'recent') { $query->where('kind', 'file'); }
        if (! empty($data['type'])) {
            $query->where('kind', 'file');
            match ($data['type']) {
                'image' => $query->where('mime', 'like', 'image/%'),
                'video' => $query->where('mime', 'like', 'video/%'),
                'archive' => $query->where('extension', 'zip'),
                default => $query->where('mime', 'not like', 'image/%')->where('mime', 'not like', 'video/%')->where('extension', '!=', 'zip'),
            };
        }
        $sort = $data['sort'] ?? 'newest';
        $query->orderByRaw("CASE WHEN kind = 'folder' THEN 0 ELSE 1 END");
        $query->orderBy(match ($sort) { 'name' => 'name', 'size' => 'size', default => 'created_at' }, in_array($sort, ['name', 'oldest']) ? 'asc' : 'desc')->orderBy('id');

        // Phân trang trực tiếp trên Database để tối ưu hiệu năng và RAM
        $total = $query->count();
        $page = (int) ($data['page'] ?? 1);
        $perPage = (int) ($data['per_page'] ?? 40);

        // Eager load quan hệ 'parent' để triệt tiêu hoàn toàn truy vấn N+1
        $items = $query->with('parent')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        $ancestors = [];
        $current = $parent;
        while ($current) {
            array_unshift($ancestors, ['id' => $current->id, 'name' => $current->name]);
            $current = $current->parent;
        }

        // Thống kê nhanh toàn hệ thống qua 1 câu truy vấn gộp SQL duy nhất
        $statsData = DB::table('fm_nodes')
            ->whereNull('deleted_at')
            ->selectRaw("
                SUM(CASE WHEN kind = 'file' THEN 1 ELSE 0 END) as files_count,
                SUM(CASE WHEN kind = 'folder' THEN 1 ELSE 0 END) as folders_count,
                SUM(size) as total_bytes,
                SUM(CASE WHEN mime LIKE 'image/%' THEN 1 ELSE 0 END) as count_images,
                SUM(CASE WHEN mime LIKE 'video/%' THEN 1 ELSE 0 END) as count_videos,
                SUM(CASE WHEN extension = 'zip' THEN 1 ELSE 0 END) as count_archives,
                SUM(CASE WHEN mime NOT LIKE 'image/%' AND mime NOT LIKE 'video/%' AND extension != 'zip' AND kind = 'file' THEN 1 ELSE 0 END) as count_documents
            ")
            ->first();

        $trashCount = DB::table('fm_nodes')->whereNotNull('deleted_at')->count();

        return response()->json([
            'data' => $items->map(fn ($node) => $this->present($node, $request))->values(),
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => max(1, (int) ceil($total / $perPage)),
            ],
            'breadcrumbs' => $ancestors,
            'stats' => [
                'bytes' => (int) ($statsData->total_bytes ?? 0),
                'files' => (int) ($statsData->files_count ?? 0),
                'folders' => (int) ($statsData->folders_count ?? 0),
                'trash' => $trashCount,
            ],
            'counts' => [
                'all' => (int) ($statsData->files_count ?? 0) + (int) ($statsData->folders_count ?? 0),
                'image' => (int) ($statsData->count_images ?? 0),
                'document' => (int) ($statsData->count_documents ?? 0),
                'video' => (int) ($statsData->count_videos ?? 0),
                'archive' => (int) ($statsData->count_archives ?? 0),
            ],
            'can_upload' => ! $trash && $this->access->allows($request->user(), 'upload', $parent),
        ]);
    }

    public function tree(Request $request)
    {
        return response()->json(['data' => Node::where('kind', 'folder')->orderBy('name')->get()
            ->filter(fn ($node) => $this->access->allows($request->user(), 'view', $node))
            ->map(fn ($node) => $this->present($node, $request))->values()]);
    }

    public function upload(Request $request)
    {
        $data = $request->validate([
            'files' => 'required|array|min:1|max:'.config('file-manager.upload.max_files'),
            'files.*' => 'required|file|max:'.config('file-manager.upload.max_kb'),
            'parent_id' => 'nullable|integer|min:1', 'visibility' => ['required', Rule::in(['shared', 'private'])],
        ]);
        $parent = $this->library->parent($data['parent_id'] ?? null, $request->user());
        $nodes = []; $created = [];
        try {
            foreach ($data['files'] as $file) {
                $node = $this->library->upload($file, $request->user(), $parent, $data['visibility']);
                $created[] = $node;
                $nodes[] = $this->present($node, $request);
            }
        } catch (\Throwable $e) {
            foreach ($created as $node) { Storage::disk($node->disk)->delete(array_filter([$node->path, $node->thumbnail_path])); $node->forceDelete(); }
            throw $e;
        }
        return response()->json(['data' => $nodes], 201);
    }

    public function folder(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:255', 'parent_id' => 'nullable|integer|min:1', 'visibility' => ['required', Rule::in(['shared', 'private'])]]);
        $parent = $this->library->parent($data['parent_id'] ?? null, $request->user());
        $node = Node::create(['name' => $this->library->name($data['name']), 'parent_id' => $parent?->id, 'kind' => 'folder', 'visibility' => $parent?->visibility ?? $data['visibility'], 'owner_id' => (string) $request->user()->getAuthIdentifier()]);
        return response()->json(['data' => $this->present($node, $request)], 201);
    }

    public function update(Request $request, int $id)
    {
        $node = Node::findOrFail($id);
        $this->access->authorize($request->user(), 'update', $node);
        $data = $request->validate(['name' => 'sometimes|required|string|max:255', 'parent_id' => 'sometimes|nullable|integer|min:1']);
        DB::transaction(function () use ($data, $node, $request) {
            if (array_key_exists('parent_id', $data)) { $this->library->move($node, $this->library->parent($data['parent_id'], $request->user()), $request->user()); }
            if (isset($data['name'])) {
                $name = $this->library->name($data['name']);
                if ($node->kind === 'file' && strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== $node->extension) {
                    abort(422, 'Đổi tên phải giữ nguyên phần mở rộng file.');
                }
                $node->update(['name' => $name]);
            }
        });
        return response()->json(['data' => $this->present($node->fresh(), $request)]);
    }

    public function trash(Request $request, int $id)
    {
        $this->library->trash(Node::findOrFail($id), $request->user());
        return response()->json(['message' => 'Đã chuyển vào thùng rác.']);
    }

    public function restore(Request $request, int $id)
    {
        $node = Node::onlyTrashed()->findOrFail($id);
        $this->library->restore($node, $request->user());
        return response()->json(['message' => 'Đã khôi phục.']);
    }

    public function purge(Request $request, int $id)
    {
        $this->library->purge(Node::onlyTrashed()->findOrFail($id), $request->user());
        return response()->json(['message' => 'Đã xóa vĩnh viễn.']);
    }

    public function transform(Request $request, int $id)
    {
        $node = Node::findOrFail($id);
        $this->access->authorize($request->user(), 'update', $node);
        $parent = $this->library->parent($node->parent_id, $request->user());
        abort_unless($node->isImage(), 422, 'Chỉ có thể chỉnh sửa ảnh.');
        $max = config('file-manager.images.max_dimension');
        $data = $request->validate([
            'width' => "nullable|integer|min:1|max:$max", 'height' => "nullable|integer|min:1|max:$max",
            'format' => ['required', Rule::in(['jpg', 'png', 'webp', 'gif'])],
            'crop' => 'sometimes|array:x,y,width,height',
            'crop.x' => 'required_with:crop|integer|min:0', 'crop.y' => 'required_with:crop|integer|min:0',
            'crop.width' => "required_with:crop|integer|min:1|max:$max", 'crop.height' => "required_with:crop|integer|min:1|max:$max",
            'watermark' => 'sometimes|array:text,position', 'watermark.text' => 'nullable|string|max:100',
            'watermark.position' => ['required_with:watermark', Rule::in(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])],
        ]);
        $data = array_filter($data, fn ($value) => $value !== null);
        $result = $this->images->transform(Storage::disk($node->disk)->get($node->path), $data, $data['format']);
        $output = $this->library->store($result['bytes'], [
            'owner_id' => (string) $request->user()->getAuthIdentifier(), 'parent_id' => $parent?->id,
            'visibility' => $node->visibility,
            'name' => mb_substr(pathinfo($node->name, PATHINFO_FILENAME), 0, 210).'-edited-'.now()->format('His').'.'.$data['format'],
            'extension' => $data['format'], 'mime' => 'image/'.($data['format'] === 'jpg' ? 'jpeg' : $data['format']),
        ]);
        return response()->json(['data' => $this->present($output, $request)], 201);
    }

    public function grants(Request $request, int $id)
    {
        $node = Node::findOrFail($id); $this->access->authorize($request->user(), 'share', $node);
        return response()->json(['data' => $node->grants()->get(['user_id', 'view', 'upload', 'update', 'delete'])]);
    }

    public function saveGrant(Request $request, int $id)
    {
        $node = Node::findOrFail($id); $this->access->authorize($request->user(), 'share', $node);
        $data = $request->validate(['user_id' => 'required|string|max:191', 'view' => 'required|boolean', 'upload' => 'required|boolean', 'update' => 'required|boolean', 'delete' => 'required|boolean']);
        abort_unless(auth()->getProvider()->retrieveById($data['user_id']), 422, 'Người dùng không tồn tại.');
        Grant::updateOrCreate(['node_id' => $node->id, 'user_id' => $data['user_id']], $data);
        return response()->json(['message' => 'Đã cập nhật quyền.']);
    }

    public function revokeGrant(Request $request, int $id, string $userId)
    {
        $node = Node::findOrFail($id); $this->access->authorize($request->user(), 'share', $node);
        $node->grants()->where('user_id', $userId)->delete();
        return response()->json(['message' => 'Đã thu hồi quyền.']);
    }

    public function content(Request $request, int $id)
    {
        $node = Node::findOrFail($id); $this->access->authorize($request->user(), 'view', $node);
        return $this->serve($request, $node);
    }

    public function media(Request $request, int $id)
    {
        $node = Node::findOrFail($id); abort_unless($node->isPublic(), 404);
        return $this->serve($request, $node);
    }

    private function serve(Request $request, Node $node)
    {
        $this->library->assertActive($node);
        abort_unless($node->kind === 'file', 404);
        $thumb = $request->boolean('thumbnail');
        $path = $thumb ? ($node->thumbnail_path ?: $node->path) : $node->path;
        abort_unless($path && Storage::disk($node->disk)->exists($path), 404);
        $inline = ! $request->boolean('download') && ($node->isImage() || str_starts_with($node->mime, 'video/'));
        return Storage::disk($node->disk)->response($path, $thumb ? 'thumbnail.webp' : $node->name, [
            'Content-Type' => ($thumb && $node->thumbnail_path) ? 'image/webp' : $node->mime,
            'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ], $inline ? 'inline' : 'attachment');
    }
}
