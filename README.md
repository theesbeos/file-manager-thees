# 📂 KBTech Laravel File Manager

<p align="center">
  <img src="https://raw.githubusercontent.com/theesbeos/file-manager-thees/main/resources/assets/preview.png" alt="KBTech File Manager Preview" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" onerror="this.style.display='none'">
</p>

<p align="center">
  <a href="https://packagist.org/packages/kbtech/laravel-file-manager"><img src="https://img.shields.io/badge/Laravel-10.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel 10"></a>
  <a href="https://php.net"><img src="https://img.shields.io/badge/PHP-8.3+-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP 8.3+"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License MIT"></a>
  <a href="https://github.com/theesbeos/file-manager-thees"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome"></a>
</p>

---

**KBTech Laravel File Manager** là giải pháp quản lý tệp tin và thư viện đa phương tiện (Media Library) cao cấp dành riêng cho hệ sinh thái **Laravel 10** và **PHP 8.3**. Được thiết kế tối ưu hóa cho trải nghiệm người dùng hiện đại, giao diện tiếng Việt thân thiện, bảo mật chặt chẽ và tích hợp linh hoạt vào mọi dự án (CMS, CRM, Blog, E-commerce).

---

## ✨ Tính Năng Nổi Bật

- 🎨 **Giao diện hiện đại & Mượt mà**: Thiết kế theo chuẩn giao diện phẳng tinh tế, hỗ trợ tùy biến màu sắc thương hiệu (Brand Color), chuyển đổi linh hoạt giữa chế độ **Lưới (Grid)** và **Danh sách (List)**.
- ⚡ **Kéo & Thả Đa Tệp (Drag & Drop)**: Tải lên hàng loạt tệp tin cùng lúc với thanh tiến trình trực quan, tự động kiểm tra định dạng và dung lượng trước khi đẩy lên máy chủ.
- 🚀 **Hiệu Năng Siêu Tốc & Không N+1 Query**: Phân trang trực tiếp trên Database, truy vấn thống kê gộp 1 câu SQL duy nhất (~18ms), loại bỏ hoàn toàn hiện tượng giật chớp màn hình (skeleton flash) và giữ nguyên vị trí cuộn cây thư mục.
- 🌳 **Cây thư mục lồng nhau (Folder Tree)**: Quản lý thư mục đa cấp mượt mà, hỗ trợ tạo mới, đổi tên, di chuyển tệp tin và thư mục nhanh chóng.
- 🖼 **Bộ công cụ xử lý ảnh tích hợp**:
  - Cắt ảnh (Crop), thay đổi kích thước (Resize), xoay ảnh.
  - Đóng dấu bản quyền (Watermark) dạng chữ hỗ trợ Unicode tiếng Việt hoặc chèn logo thương hiệu.
  - Tự động sinh ảnh thu nhỏ (Thumbnail) chuẩn định dạng hiện đại **WebP** giúp tải trang siêu tốc.
  - Giữ nguyên vẹn ảnh gốc chất lượng cao và tạo phiên bản mới khi chỉnh sửa.
- 🛡 **Bảo mật & Phân quyền chuyên sâu (Granular ACL)**:
  - Phân tách rõ ràng giữa **Thư viện chung (Public Shared)** và **Thư viện riêng tư (Private)**.
  - Phân quyền theo từng người dùng (User ID) với cơ chế kế thừa từ thư mục cha xuống thư mục con.
  - Dễ dàng ghi đè chính sách ủy quyền thông qua hệ thống **Laravel Gates** (`view`, `upload`, `update`, `delete`, `share`).
  - Hỗ trợ phát trực tuyến an toàn (Stream media) với HTTP Range requests, che giấu đường dẫn tệp thực trên máy chủ.
- 🎯 **File Picker thông minh**:
  - Dễ dàng tích hợp vào bất kỳ form nhập liệu, popup modal hoặc trình soạn thảo WYSIWYG.
  - Hỗ trợ cả chế độ chọn đơn (Single) và chọn nhiều (Multiple), tự động điền ID và trả dữ liệu JSON chi tiết.
- 🗑 **Thùng rác an toàn & Quản lý dung lượng (Quota)**:
  - Khôi phục hoặc xóa vĩnh viễn tệp tin khỏi hệ thống.
  - Theo dõi dung lượng đã sử dụng theo thời gian thực với thanh chỉ báo hạn ngạch trực quan.

---

## 📋 Yêu Cầu Hệ Thống

- **PHP**: `^8.3` (Kích hoạt extension: `fileinfo`, `gd`, `pdo`)
- **Laravel Framework**: `^10.48`
- Cơ chế xác thực Session người dùng (hỗ trợ `web` & `auth` middleware của Laravel)

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Thêm Package vào dự án Laravel

Trong file `composer.json` của dự án Laravel chủ, cấu hình repository trỏ tới thư mục package:

```json
"repositories": [
    {
        "type": "path",
        "url": "../library/kbtech-file-manager"
    }
]
```

Cài đặt package thông qua Composer:

```bash
composer require kbtech/laravel-file-manager:@dev
```

### 2. Xuất bản cấu hình & Tài nguyên giao diện

Chạy các lệnh Artisan sau để publish file cấu hình và assets (CSS/JS) vào ứng dụng:

```bash
# Xuất bản file cấu hình config/file-manager.php
php artisan vendor:publish --tag=file-manager-config

# Xuất bản assets (CSS, JS) vào public/vendor/file-manager
php artisan vendor:publish --tag=file-manager-assets
```

> **Lưu ý**: Khi cập nhật phiên bản mới của package, hãy thêm flag `--force` để làm mới assets:
> ```bash
> php artisan vendor:publish --tag=file-manager-assets --force
> ```

### 3. Chạy Migration tạo bảng CSDL

Tạo các bảng dữ liệu quản lý tệp (`fm_nodes`), phân quyền (`fm_grants`) và khóa tương tranh (`fm_locks`):

```bash
php artisan migrate
```

### 4. Đồng bộ các tệp tin có sẵn trên máy chủ (Tùy chọn)

Nếu bạn có sẵn các tệp tin/hình ảnh trong storage (ví dụ `storage/app/public`), hãy đồng bộ toàn bộ vào cơ sở dữ liệu File Manager:

```bash
php artisan file-manager:sync
```

Hoặc chỉ định disk cụ thể và làm mới chỉ mục:

```bash
php artisan file-manager:sync --disk=public --fresh
```

### 5. Truy cập & Trải nghiệm

Đăng nhập vào tài khoản người dùng trên ứng dụng của bạn và truy cập:
👉 `https://your-domain.test/file-manager`

---

## ⚙️ Cấu Hình Chi Tiết

File cấu hình đặt tại `config/file-manager.php`. Dưới đây là các thông số chính bạn có thể tùy biến:

```php
return [
    // Tiền tố đường dẫn truy cập (vd: /file-manager)
    'prefix' => 'file-manager',

    // Middleware bảo vệ
    'middleware' => ['web', 'auth'],

    // Layout của ứng dụng chủ để nhúng File Manager (vd: 'layouts.admin', 'admin.master', ...)
    // Nếu để null: hiển thị chế độ độc lập (standalone) toàn màn hình.
    'layout' => env('FILE_MANAGER_LAYOUT', null),
    'section' => env('FILE_MANAGER_SECTION', 'content'),

    // Disk lưu trữ private (khuyến nghị không symlink ra public)
    'disk' => 'file-manager',

    // Cho phép truy cập URL file chung trên trang public mà không cần đăng nhập
    'public_shared' => true,

    // Tùy biến thương hiệu
    'brand' => [
        'name' => 'KBTech',
        'color' => '#f9c100', // Mã màu chủ đạo
        'watermark' => 'KBTECH',
    ],

    // Giới hạn tải lên
    'upload' => [
        'max_kb' => 20480,       // Tối đa 20 MB / tệp
        'max_files' => 20,       // Tối đa 20 tệp / lượt tải
        'quota_bytes' => 10 * 1024 * 1024 * 1024, // Hạn ngạch 10 GB
        'types' => [
            'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'],
            'png' => ['image/png'], 'webp' => ['image/webp'], 'gif' => ['image/gif'],
            'pdf' => ['application/pdf'], 'txt' => ['text/plain'],
            'csv' => ['text/plain', 'text/csv'], 'zip' => ['application/zip'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            'mp4' => ['video/mp4'], 'webm' => ['video/webm'],
        ],
    ],

    // Cấu hình xử lý hình ảnh
    'images' => [
        'max_pixels' => 24_000_000,
        'max_dimension' => 8192,
        'thumbnail_width' => 480,
        'thumbnail_height' => 360,
        'quality' => 85,
        'font' => null,             // Đường dẫn file .ttf hỗ trợ tiếng Việt có dấu
        'watermark_image' => null,  // Đường dẫn tệp ảnh logo trên server
    ],
];
```

### 🖥️ Nhúng vào Giao Diện Quản Trị (Embedded vs Standalone Mode)

Package hỗ trợ linh hoạt 2 chế độ hiển thị:

1. **Chế độ Nhúng (Embedded - Khuyên dùng cho Admin Dashboard)**:
   - Khi dự án đã có sẵn giao diện quản trị (Header, Sidebar menu bên trái), bạn chỉ cần cấu hình trong file `.env` hoặc `config/file-manager.php`:
     ```env
     FILE_MANAGER_LAYOUT=layouts.admin
     FILE_MANAGER_SECTION=content
     ```
   - File Manager sẽ tự động hiển thị gọn gàng bên trong vùng nội dung `@yield('content')`, hoạt động như một thành phần (component) nội bộ, **giữ nguyên toàn bộ thanh menu (sidebar) và thanh điều hướng (header) của hệ thống cũ**, không bị tràn hay che mất giao diện chung.
2. **Chế độ Độc lập (Standalone Mode)**:
   - Để `FILE_MANAGER_LAYOUT=null` hoặc truy cập kèm tham số: `/file-manager?standalone=1`.
   - File Manager sẽ mở toàn màn hình, tối ưu khi chạy độc lập hoặc mở trong cửa sổ popup chọn file (`picker=1`).

---

## 🔒 Phân Quyền & Tích Hợp Laravel Gates

Hệ thống cung cấp cơ chế phân quyền nhiều tầng:

1. **Phân quyền người sở hữu**: Người tải lên có toàn quyền với tệp của mình. Chủ sở hữu thư mục có quyền quản lý toàn bộ tệp bên trong.
2. **Kế thừa quyền**: Phân quyền trên thư mục cha tự động áp dụng xuống các thư mục con và tệp tin bên trong.
3. **Ghi đè bằng Laravel Gates**: Ứng dụng chủ có thể can thiệp vào quyết định ủy quyền bằng cách đăng ký Gates trong `AuthServiceProvider.php`:

```php
use App\Models\User;
use KBTech\FileManager\Models\Node;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    // Ví dụ: Cho phép Admin có mọi quyền
    Gate::before(function (User $user, string $ability) {
        if ($user->isSuperAdmin()) {
            return true;
        }
    });

    // Tùy biến kiểm tra quyền xem file
    Gate::define('file-manager.view', function (User $user, ?Node $node) {
        if ($node === null) {
            return true; // Truy cập thư mục gốc
        }
        return $node->user_id === $user->id || $user->hasRole('editor');
    });

    // Tùy biến kiểm tra quyền upload
    Gate::define('file-manager.upload', function (User $user, ?Node $node) {
        return $user->can_upload_files;
    });
}
```

---

## 🧩 Tích Hợp File Picker Vào Form Giao Diện

Package cung cấp sẵn thư viện JavaScript `picker.js` giúp mở hộp thoại chọn tệp cực kỳ đơn giản:

### Ví dụ 1: Chọn một ảnh đơn (Single Image Picker)

```html
<div class="form-group">
  <label>Ảnh đại diện:</label>
  <div style="display: flex; gap: 10px; align-items: center;">
    <img id="avatar-preview" src="/placeholder.png" width="100" height="100" style="object-fit: cover; border-radius: 8px;">
    <input type="hidden" id="avatar-id" name="avatar_id">
    <button type="button" id="btn-pick-avatar" class="btn btn-secondary">Chọn ảnh</button>
  </div>
</div>

<!-- Nạp script picker -->
<script src="/vendor/file-manager/picker.js"></script>
<script>
document.getElementById('btn-pick-avatar').onclick = function () {
    KBTechFilePicker.open({
        url: '/file-manager',
        type: 'image',          // Lọc chỉ hiển thị ảnh
        multiple: false,        // Chỉ chọn 1 ảnh
        input: '#avatar-id',    // Tự động gán ID vào hidden input
        onSelect: function (file) {
            // Nhận đối tượng tệp tin được chọn
            document.getElementById('avatar-preview').src = file.url;
            console.log('Tệp đã chọn:', file);
        }
    });
};
</script>
```

### Ví dụ 2: Chọn nhiều tài liệu / ảnh (Multiple Picker)

```javascript
KBTechFilePicker.open({
    url: '/file-manager',
    type: 'all',
    multiple: true,
    input: '#gallery-ids', // Gán mảng ID dạng JSON vào input
    onSelect: function (files) {
        files.forEach(file => {
            console.log(file.name, file.url, file.size);
        });
    }
});
```

---

## 📡 API Endpoints Tham Khảo

Tất cả các API được bảo vệ bởi middleware xác thực của ứng dụng:

| Phương thức | Tuyến đường (Route) | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/file-manager` | Trang giao diện quản lý tệp |
| `GET` | `/file-manager/media/{id}` | Phát trực tuyến nội dung media / file |
| `GET` | `/file-manager/api/nodes` | Lấy danh sách tệp theo thư mục và bộ lọc |
| `GET` | `/file-manager/api/tree` | Lấy sơ đồ cây thư mục |
| `POST` | `/file-manager/api/upload` | Tải lên tệp mới (hỗ trợ đa tệp) |
| `POST` | `/file-manager/api/folders` | Tạo thư mục mới |
| `PATCH` | `/file-manager/api/nodes/{id}` | Đổi tên hoặc di chuyển tệp / thư mục |
| `DELETE`| `/file-manager/api/nodes/{id}` | Chuyển tệp vào thùng rác |
| `POST` | `/file-manager/api/nodes/{id}/restore` | Khôi phục tệp từ thùng rác |
| `DELETE`| `/file-manager/api/nodes/{id}/purge` | Xóa vĩnh viễn tệp và dữ liệu vật lý |
| `POST` | `/file-manager/api/nodes/{id}/transform` | Cắt, thu phóng hoặc đóng dấu ảnh |
| `GET` | `/file-manager/api/nodes/{id}/grants` | Lấy danh sách phân quyền của tệp |
| `PUT` | `/file-manager/api/nodes/{id}/grants` | Thêm / cập nhật quyền người dùng |
| `DELETE`| `/file-manager/api/nodes/{id}/grants/{userId}` | Thu hồi quyền của người dùng |

---

## 🛠 Tối Ưu Hóa & Ghi Chú Môi Trường Máy Chủ

1. **Cấu hình PHP**: Đảm bảo các chỉ thị trong `php.ini` cho phép kích thước upload tương ứng với cấu hình package:
   ```ini
   upload_max_filesize = 50M
   post_max_size = 50M
   memory_limit = 256M
   ```
2. **Cấu hình Web Server (Nginx / Apache)**:
   - Với **Nginx**, hãy kiểm tra `client_max_body_size 50M;`.
   - Với **Apache**, kiểm tra `LimitRequestBody`.
3. **Phông chữ tiếng Việt cho Watermark**: Nếu sử dụng tính năng đóng dấu văn bản tiếng Việt có dấu, hãy cấu hình đường dẫn font `.ttf` (ví dụ `Roboto-Bold.ttf` hoặc `BeVietnamPro.ttf`) trong `config/file-manager.php` tại mục `images.font`.

---

## 📄 Giấy Phép (License)

Dự án được phát hành theo giấy phép **[MIT License](LICENSE)**. Tự do sử dụng, chỉnh sửa và tích hợp vào các dự án cá nhân cũng như thương mại.

---

<p align="center">
  Phát triển với ❤️ bởi <b>Thees Beos & KBTech Team</b>
</p>