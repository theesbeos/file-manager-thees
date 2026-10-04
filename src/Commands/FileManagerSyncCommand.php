<?php

namespace KBTech\FileManager\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use KBTech\FileManager\Models\Node;

class FileManagerSyncCommand extends Command
{
    /**
     * Tên và cú pháp của lệnh artisan.
     *
     * @var string
     */
    protected $signature = 'file-manager:sync 
                            {--disk=public : Disk lưu trữ cần quét (mặc định: public)} 
                            {--fresh : Xóa toàn bộ chỉ mục cũ trên disk này và đồng bộ lại từ đầu}';

    /**
     * Mô tả lệnh artisan.
     *
     * @var string
     */
    protected $description = 'Quét và đồng bộ toàn bộ file/ảnh có sẵn trên disk vào cơ sở dữ liệu File Manager';

    /**
     * Thực thi lệnh artisan.
     */
    public function handle(): int
    {
        $diskName = $this->option('disk') ?: 'public';
        $this->info("Bắt đầu quét và đồng bộ tệp tin có sẵn từ disk '{$diskName}' vào File Manager...");

        $disk = Storage::disk($diskName);
        $userModel = config('auth.providers.users.model', \App\Models\User::class);
        $admin = class_exists($userModel) ? $userModel::first() : null;
        $adminId = $admin ? (string) $admin->getAuthIdentifier() : '1';

        if ($this->option('fresh')) {
            $this->warn("Đang làm mới dữ liệu chỉ mục cũ trên disk '{$diskName}'...");
            Node::where('disk', $diskName)->forceDelete();
        }

        // Tự động quét các thư mục cấp 1 trên disk
        $directories = $disk->directories();
        if (empty($directories)) {
            $directories = ['.'];
        }

        $importedTotal = 0;
        $skippedTotal = 0;
        $summaryTable = [];

        foreach ($directories as $folderPath) {
            $isRoot = ($folderPath === '.');
            $folderNode = null;

            if (! $isRoot) {
                $folderName = basename($folderPath);
                $folderNode = Node::firstOrCreate(
                    ['name' => $folderName, 'parent_id' => null, 'kind' => 'folder'],
                    [
                        'owner_id' => $adminId,
                        'visibility' => 'shared',
                        'disk' => $diskName,
                        'path' => $folderPath,
                    ]
                );
            }

            $files = $isRoot ? $disk->files() : $disk->allFiles($folderPath);
            $importedCount = 0;
            $skippedCount = 0;

            foreach ($files as $filePath) {
                $fileName = basename($filePath);
                if (in_array(strtolower($fileName), ['.gitignore', '.ds_store', 'thumbs.db'])) {
                    continue;
                }

                $exists = Node::where('disk', $diskName)->where('path', $filePath)->exists();
                if ($exists) {
                    $skippedCount++;
                    continue;
                }

                $size = 0;
                try {
                    $size = $disk->size($filePath);
                } catch (\Throwable) {}

                $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
                $mime = null;
                try {
                    $mime = $disk->mimeType($filePath);
                } catch (\Throwable) {}
                $mime = $mime ?: 'application/octet-stream';

                $dimensions = [null, null];
                if ($ext === 'svg' || (str_starts_with($mime, 'image/') && in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif']))) {
                    try {
                        $fullPath = $disk->path($filePath);
                        if (file_exists($fullPath)) {
                            if ($ext === 'svg') {
                                $content = @file_get_contents($fullPath);
                                if ($content) {
                                    $dimensions = app(\KBTech\FileManager\Services\Images::class)->dimensions($content);
                                }
                            } else {
                                $dim = @getimagesize($fullPath);
                                if ($dim) {
                                    $dimensions = [$dim[0], $dim[1]];
                                }
                            }
                        }
                    } catch (\Throwable) {}
                }

                Node::create([
                    'parent_id' => $folderNode?->id,
                    'owner_id' => $adminId,
                    'visibility' => 'shared',
                    'kind' => 'file',
                    'disk' => $diskName,
                    'path' => $filePath,
                    'name' => $fileName,
                    'extension' => $ext ?: null,
                    'mime' => $mime,
                    'size' => $size,
                    'width' => $dimensions[0],
                    'height' => $dimensions[1],
                    'thumbnail_path' => null,
                ]);

                $importedCount++;
            }

            $importedTotal += $importedCount;
            $skippedTotal += $skippedCount;

            $summaryTable[] = [
                'Thư mục' => $isRoot ? '(Thư mục gốc)' : basename($folderPath),
                'Đường dẫn' => $folderPath,
                'Tổng file' => count($files),
                'Mới thêm' => $importedCount,
                'Đã có sẵn' => $skippedCount,
            ];
        }

        $this->table(['Thư mục', 'Đường dẫn', 'Tổng file', 'Mới thêm', 'Đã có sẵn'], $summaryTable);
        $this->info("Đồng bộ hoàn tất! Đã thêm mới: {$importedTotal} tệp, Bỏ qua đã tồn tại: {$skippedTotal} tệp.");
        $this->info("Tổng số bản ghi trong thư viện: " . Node::count());

        return Command::SUCCESS;
    }
}
