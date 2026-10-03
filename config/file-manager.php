<?php

return [
    'prefix' => 'file-manager',
    'middleware' => ['web', 'auth'],
    // A private disk: never point this at storage/app/public.
    'disk' => 'file-manager',
    'public_shared' => true,
    'brand' => ['name' => 'KBTech', 'color' => '#f9c100', 'watermark' => 'KBTECH'],
    'upload' => [
        'max_kb' => 20480,
        'max_files' => 20,
        'quota_bytes' => 10 * 1024 * 1024 * 1024,
        'types' => [
            'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'],
            'png' => ['image/png'], 'webp' => ['image/webp'], 'gif' => ['image/gif'],
            'pdf' => ['application/pdf'], 'txt' => ['text/plain'],
            'csv' => ['text/plain', 'text/csv'], 'zip' => ['application/zip', 'application/x-zip-compressed'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
            'mp4' => ['video/mp4'], 'webm' => ['video/webm'],
        ],
    ],
    'images' => [
        'max_pixels' => 24_000_000,
        'max_dimension' => 8192,
        'thumbnail_width' => 480,
        'thumbnail_height' => 360,
        'quality' => 85,
        // Set a Unicode TTF font path for Vietnamese watermarks.
        'font' => null,
        'watermark_image' => null,
    ],
    // Register these Gates in the host app to override default authorization.
    // A Gate receives ($user, ?Node $node). Explicit denial takes precedence.
    'gates' => [
        'view' => 'file-manager.view', 'upload' => 'file-manager.upload',
        'update' => 'file-manager.update', 'delete' => 'file-manager.delete',
        'share' => 'file-manager.share',
    ],
];
