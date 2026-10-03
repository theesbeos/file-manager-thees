<?php

namespace KBTech\FileManager\Services;

use GdImage;
use Illuminate\Validation\ValidationException;

class Images
{
    public function dimensions(string $bytes): array
    {
        $info = @getimagesizefromstring($bytes);
        if (! $info || $info[0] * $info[1] > config('file-manager.images.max_pixels')) {
            throw ValidationException::withMessages(['file' => 'Ảnh không hợp lệ hoặc vượt giới hạn số pixel.']);
        }
        return [$info[0], $info[1]];
    }

    private function decode(string $bytes): GdImage
    {
        $this->dimensions($bytes);
        $image = @imagecreatefromstring($bytes);
        if (! $image) { throw ValidationException::withMessages(['file' => 'Không thể đọc định dạng ảnh này.']); }
        imagepalettetotruecolor($image);
        imagesavealpha($image, true);
        return $image;
    }

    private function canvas(int $width, int $height): GdImage
    {
        if ($width < 1 || $height < 1 || $width * $height > config('file-manager.images.max_pixels')) {
            throw ValidationException::withMessages(['width' => 'Kích thước ảnh vượt giới hạn số pixel.']);
        }
        $image = imagecreatetruecolor($width, $height);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        return $image;
    }

    private function encode(GdImage $image, string $format): string
    {
        $flat = null;
        if (in_array($format, ['jpg', 'jpeg'])) {
            $flat = imagecreatetruecolor(imagesx($image), imagesy($image));
            imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
            imagecopy($flat, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));
            $image = $flat;
        }
        ob_start();
        try {
            $ok = match ($format) {
                'png' => imagepng($image),
                'jpg', 'jpeg' => imagejpeg($image, null, config('file-manager.images.quality')),
                'gif' => imagegif($image),
                default => imagewebp($image, null, config('file-manager.images.quality')),
            };
            $bytes = ob_get_contents();
            if (! $ok || ! $bytes) { throw new \RuntimeException('Không thể xuất ảnh.'); }
            return $bytes;
        } finally { ob_end_clean(); if ($flat) { imagedestroy($flat); } }
    }

    public function thumbnail(string $bytes): string
    {
        $source = $this->decode($bytes);
        try {
            $ratio = min(1, config('file-manager.images.thumbnail_width') / imagesx($source), config('file-manager.images.thumbnail_height') / imagesy($source));
            $width = max(1, (int) round(imagesx($source) * $ratio));
            $height = max(1, (int) round(imagesy($source) * $ratio));
            $thumb = $this->canvas($width, $height);
            try {
                imagecopyresampled($thumb, $source, 0, 0, 0, 0, $width, $height, imagesx($source), imagesy($source));
                return $this->encode($thumb, 'webp');
            } finally { imagedestroy($thumb); }
        } finally { imagedestroy($source); }
    }

    public function transform(string $bytes, array $options, string $format): array
    {
        $image = $this->decode($bytes);
        try {
            if (isset($options['crop'])) {
                $crop = $options['crop'];
                if ($crop['x'] + $crop['width'] > imagesx($image) || $crop['y'] + $crop['height'] > imagesy($image)) {
                    throw ValidationException::withMessages(['crop' => 'Vùng cắt nằm ngoài ảnh gốc.']);
                }
                $cropped = imagecrop($image, $crop);
                if (! $cropped) { throw ValidationException::withMessages(['crop' => 'Vùng cắt không hợp lệ.']); }
                imagedestroy($image);
                $image = $cropped;
                imagesavealpha($image, true);
            }
            if (isset($options['width']) || isset($options['height'])) {
                $width = $options['width'] ?? max(1, (int) round(imagesx($image) * $options['height'] / imagesy($image)));
                $height = $options['height'] ?? max(1, (int) round(imagesy($image) * $options['width'] / imagesx($image)));
                $resized = $this->canvas($width, $height);
                imagecopyresampled($resized, $image, 0, 0, 0, 0, $width, $height, imagesx($image), imagesy($image));
                imagedestroy($image);
                $image = $resized;
            }
            if (! empty($options['watermark'])) { $this->watermark($image, $options['watermark']); }
            if (imagesx($image) > config('file-manager.images.max_dimension') || imagesy($image) > config('file-manager.images.max_dimension')) {
                throw ValidationException::withMessages(['width' => 'Chiều ảnh đầu ra vượt giới hạn cho phép.']);
            }
            return ['bytes' => $this->encode($image, $format), 'width' => imagesx($image), 'height' => imagesy($image)];
        } finally { imagedestroy($image); }
    }

    private function watermark(GdImage $image, array $options): void
    {
        imagealphablending($image, true);
        $text = $options['text'] ?? config('file-manager.brand.watermark');
        $font = config('file-manager.images.font');
        $logoPath = config('file-manager.images.watermark_image');
        $padding = 20;
        $position = $options['position'] ?? 'bottom-right';
        if ($logoPath && is_file($logoPath)) {
            $logo = $this->decode(file_get_contents($logoPath));
            try {
                $ratio = min(1, imagesx($image) * .25 / imagesx($logo), imagesy($image) * .25 / imagesy($logo));
                $w = max(1, (int) (imagesx($logo) * $ratio)); $h = max(1, (int) (imagesy($logo) * $ratio));
                [$x, $y] = $this->position($image, $position, $w, $h, $padding);
                imagecopyresampled($image, $logo, $x, $y, 0, 0, $w, $h, imagesx($logo), imagesy($logo));
            } finally { imagedestroy($logo); }
            return;
        }
        $size = max(10, min(32, (int) (imagesx($image) / 35)));
        $color = imagecolorallocatealpha($image, 255, 255, 255, 20);
        $shadow = imagecolorallocatealpha($image, 0, 0, 0, 35);
        if ($font && is_file($font)) {
            $bounds = imagettfbbox($size, 0, $font, $text);
            $w = $bounds[2] - $bounds[0]; $h = $bounds[1] - $bounds[7];
            [$x, $y] = $this->position($image, $position, $w, $h, $padding);
            imagettftext($image, $size, 0, $x + 1, $y + $h + 1, $shadow, $font, $text);
            imagettftext($image, $size, 0, $x, $y + $h, $color, $font, $text);
        } else {
            if (preg_match('/[^\x20-\x7e]/', $text)) {
                throw ValidationException::withMessages(['watermark.text' => 'Cấu hình font TTF để dùng watermark tiếng Việt.']);
            }
            [$x, $y] = $this->position($image, $position, imagefontwidth(5) * strlen($text), imagefontheight(5), $padding);
            imagestring($image, 5, $x + 1, $y + 1, $text, $shadow);
            imagestring($image, 5, $x, $y, $text, $color);
        }
    }

    private function position(GdImage $image, string $position, int $width, int $height, int $padding): array
    {
        $x = str_contains($position, 'left') ? $padding : imagesx($image) - $width - $padding;
        $y = str_contains($position, 'top') ? $padding : imagesy($image) - $height - $padding;
        if ($position === 'center') { $x = (imagesx($image) - $width) / 2; $y = (imagesy($image) - $height) / 2; }
        return [max(0, (int) $x), max(0, (int) $y)];
    }
}
