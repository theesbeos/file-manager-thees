# 📂 KBTech Laravel File Manager (v2.0 Enterprise)

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

**KBTech Laravel File Manager (v2.0)** là giải pháp quản lý tệp tin và thư viện đa phương tiện (Media Library) cao cấp, đa năng và tối ưu toàn diện dành riêng cho hệ sinh thái **Laravel 10** và **PHP 8.3**. 

Được thiết kế theo tiêu chuẩn trải nghiệm hệ điều hành máy tính (Desktop-grade UX) với tốc độ phản hồi tức thì, giao diện tiếng Việt hiện đại, bảo mật chặt chẽ và khả năng nhúng linh hoạt vào mọi CMS, CRM, E-commerce, Blog hoặc Admin Dashboard.

---

## ✨ Tính Năng Nổi Bật

### 1. 🗂 Trải Nghiệm Thao Tác Chuyên Nghiệp (Desktop-Grade UX)
- 🖱 **Kéo & Thả Di Chuyển Trực Quan (Native Drag & Drop)**: Kéo một hoặc nhiều tệp được chọn thả trực tiếp vào thư mục trên lưới hoặc trên cây thư mục (Sidebar Folder Tree) để di chuyển tức thì.
- 📋 **Dán Ảnh Trực Tiếp Từ Bộ Nhớ Tạm (Paste-to-Upload)**: Chụp màn hình (`Win + Shift + S` hoặc `Cmd + Shift + 4`) và chỉ cần nhấn `Ctrl + V` / `Cmd + V` ngay trong File Manager để tải lên không cần lưu file trung gian.
- 🎯 **Menu Chuột Phải Đa Năng (Context Menu)**: Nhấp chuột phải vào bất kỳ tệp hoặc thư mục nào tại đúng vị trí con trỏ chuột để thực hiện nhanh: Xem trước, Thông tin chi tiết, Nhân bản, Sao chép link, Đổi tên, Di chuyển, Phân quyền, Xóa.
- ⌨️ **Hệ Thống Phím Tắt Tiêu Chuẩn (Pro Keyboard Shortcuts)**:
  - `Ctrl + A` / `Cmd + A`: Chọn tất cả tệp tin trong trang hiện tại.
  - `Space`: Xem nhanh tệp tin đang chọn (Quick Look).
  - `Delete` / `Backspace`: Chuyển tệp vào thùng rác.
  - `F2`: Đổi tên nhanh tệp tin / thư mục.
  - `I`: Bật / Tắt bảng xem thông tin chi tiết (Inspector Drawer).
  - `/`: Đưa con trỏ nhanh vào thanh tìm kiếm.
  - `?`: Mở bảng tra cứu phím tắt trợ giúp.
  - `Esc`: Bỏ chọn hoặc đóng cửa sổ đang mở.

### 2. 📦 Xử Lý Hàng Loạt & Thùng Rác Thông Minh (Batch Operations)
- 🗜 **Tải Xuống Tệp Nén ZIP Hàng Loạt (Batch ZIP Streaming)**: Chọn nhiều tệp hoặc thư mục và tải về toàn bộ dưới dạng file `.zip` nén chuẩn, tự động đệ quy và stream trực tiếp không ngốn RAM máy chủ.
- 📑 **Sao Chép Nhiều Đường Dẫn (Batch Copy URLs)**: Sao chép danh sách đường dẫn trực tiếp của toàn bộ tệp đã chọn vào clipboard chỉ với 1 click.
- 📦 **Di Chuyển & Xóa Hàng Loạt (Batch Move / Trash / Purge)**: Di chuyển hàng loạt tệp sang thư mục đích, chuyển vào thùng rác hoặc khôi phục nhiều tệp cùng lúc.
- 🧹 **Dọn Sạch Thùng Rác (Empty Trash)**: Xóa vĩnh viễn toàn bộ tệp và thư mục trong thùng rác cùng tệp vật lý trên ổ cứng trong 1 thao tác an toàn.

### 3. 📑 Bảng Chi Tiết Tài Nguyên (Inspector Drawer)
- Ngăn trượt bên phải hiển thị toàn diện thông số tệp: Bản xem trước lớn, Định dạng MIME, Dung lượng, Độ phân giải (`Width × Height`), Ngày tạo, Ngày sửa đổi, Không gian (Chung/Riêng tư).
- Hộp thoại sao chép nhanh URL trực tiếp và các nút hành động tiện lợi (Tải về, Nhân bản, Đổi tên, Xóa).
- Ghi nhớ trạng thái bật/tắt qua `localStorage`.

### 4. 🎵 Hỗ Trợ Đa Phương Tiện Mở Rộng Toàn Diện
- 🎧 **Âm Thanh (Audio)**: Hỗ trợ tệp `mp3`, `wav`, `ogg`, `m4a`, `flac`, `aac` kèm trình phát âm thanh (Audio Player) trực tiếp trên giao diện và tab thống kê riêng biệt.
- 📐 **Vector SVG An Toàn**: Xem trước và tải lên tệp `.svg` với cơ chế bóc tách kích thước `viewBox` tự động, phòng ngừa lỗi xử lý ảnh GD bitmap.
- 🎬 **Video Nâng Cao**: Xem trước trực tuyến mượt mà các định dạng `mp4`, `webm`, `mov`, `avi`, `mkv`.
- 💻 **Mã Nguồn & Văn Bản**: Xem trước trực tiếp nội dung các tệp `json`, `sql`, `md`, `txt`, `csv`, `log`, `css`, `js`, `html` với giao diện Code Viewer chuyên nghiệp.
- 📄 **Tài Liệu PDF**: Nhúng trình đọc PDF trực tiếp ngay trong giao diện xem trước.

### 5. 🖼 Bộ Xử Lý Ảnh Tích Hợp (In-Browser Image Editor)
- Cắt ảnh (Crop), thay đổi kích thước (Resize), giữ tỉ lệ gốc (Aspect Ratio).
- Chèn Watermark chữ Unicode tiếng Việt hoặc chèn logo thương hiệu.
- Xuất bản đa định dạng: `WebP` (tối ưu SEO & tải trang), `JPEG`, `PNG`.
- Tự động sinh ảnh thu nhỏ (Thumbnail) và luôn giữ nguyên vẹn ảnh gốc chất lượng cao.

### 6. 🚀 Hiệu Năng Siêu Tốc & Tối Ưu Truy Vấn
- **Không N+1 Query**: Thống kê số lượng theo từng loại tệp gộp trong 1 câu truy vấn SQL duy nhất (~18ms).
- Phân trang chuẩn Database, tải dữ liệu mượt mà, không giật màn hình (skeleton flash).
- Lọc theo phân loại, tìm kiếm tức thì theo từ khóa, sắp xếp đa tiêu chí (Mới nhất, Cũ nhất, Tên A-Z, Tên Z-A, Dung lượng lớn/nhỏ).

### 7. 🛡 Bảo Mật Chặt Chẽ & Phân Quyền Sâu Rộng (Granular ACL)
- Phân tách rõ ràng giữa **Thư viện chung (Public Shared)** và **Thư viện riêng tư (Private)**.
- Phân quyền theo User ID kế thừa tự động từ thư mục cha xuống con.
- Dễ dàng can thiệp và ghi đè quyền thông qua hệ thống **Laravel Gates** (`view`, `upload`, `update`, `delete`, `share`).
- Stream dữ liệu qua HTTP Range requests an toàn, che giấu đường dẫn tệp thực tế trên máy chủ.

---

## 📋 Yêu Cầu Hệ Thống

- **PHP**: `^8.3` (Extension bắt buộc: `fileinfo`, `gd`, `zip`, `pdo`, `mbstring`)
- **Laravel Framework**: `^10.48`
- Cơ chế xác thực Session (`web` & `auth` middleware của Laravel)

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Thêm Package vào dự án Laravel

Trong file `composer.json` của dự án Laravel:

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

```bash
# Xuất bản file cấu hình config/file-manager.php
php artisan vendor:publish --tag=file-manager-config

# Xuất bản assets (CSS, JS) vào public/vendor/file-manager
php artisan vendor:publish --tag=file-manager-assets --force
```

### 3. Chạy Migration tạo bảng CSDL

```bash
php artisan migrate
```

### 4. Đồng bộ các tệp tin có sẵn trên máy chủ (Tùy chọn)

Quét và nhập toàn bộ tệp tin, ảnh, âm thanh, video có sẵn trong storage vào cơ sở dữ liệu:

```bash
php artisan file-manager:sync
```

Hoặc chỉ định disk cụ thể và làm mới dữ liệu:

```bash
php artisan file-manager:sync --disk=public --fresh
```

### 5. Truy cập & Trải nghiệm

Đăng nhập vào tài khoản trên website của bạn và truy cập:
👉 `https://your-domain.test/file-manager`

---

## ⚙️ Cấu Hình Chi Tiết (`config/file-manager.php`)

```php
return [
    // Tiền tố route truy cập (mặc định: /file-manager)
    'prefix' => 'file-manager',

    // Middleware bảo vệ
    'middleware' => ['web', 'auth'],

    // Layout ứng dụng chủ khi nhúng (ví dụ: 'layouts.admin', 'admin.master')
    // Nếu để null: hiển thị chế độ độc lập (standalone) toàn màn hình.
    'layout' => env('FILE_MANAGER_LAYOUT', null),
    'section' => env('FILE_MANAGER_SECTION', 'content'),

    // Disk lưu trữ private (khuyên dùng disk riêng ngoài public)
    'disk' => 'file-manager',

    // Cho phép khách truy cập URL tài nguyên chung công khai
    'public_shared' => true,

    // Tùy biến thương hiệu & màu sắc chủ đạo
    'brand' => [
        'name' => 'KBTech',
        'color' => '#f9c100', // Mã màu Hex chủ đạo
        'watermark' => 'KBTECH',
    ],

    // Giới hạn tải lên
    'upload' => [
        'max_kb' => 20480,       // 20 MB / file
        'max_files' => 20,       // 20 file / lần tải
        'quota_bytes' => 10 * 1024 * 1024 * 1024, // Hạn ngạch 10 GB
        'types' => [
            // Hình ảnh & Vector
            'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'],
            'png' => ['image/png'], 'webp' => ['image/webp'], 'gif' => ['image/gif'],
            'svg' => ['image/svg+xml', 'text/plain', 'text/xml'],
            
            // Âm thanh
            'mp3' => ['audio/mpeg', 'audio/mp3'],
            'wav' => ['audio/wav', 'audio/x-wav'],
            'ogg' => ['audio/ogg'],
            'm4a' => ['audio/mp4', 'audio/x-m4a'],

            // Video
            'mp4' => ['video/mp4'], 'webm' => ['video/webm'], 'mov' => ['video/quicktime'],

            // Tài liệu & Code
            'pdf' => ['application/pdf'], 'txt' => ['text/plain'],
            'csv' => ['text/plain', 'text/csv'], 'zip' => ['application/zip', 'application/x-zip-compressed'],
            'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            'json' => ['application/json', 'text/plain'],
            'md' => ['text/plain', 'text/markdown'],
        ],
    ],

    // Cấu hình xử lý hình ảnh
    'images' => [
        'max_pixels' => 24_000_000,
        'max_dimension' => 8192,
        'thumbnail_width' => 480,
        'thumbnail_height' => 360,
        'quality' => 85,
        'font' => null,             // File .ttf tiếng Việt cho Watermark
        'watermark_image' => null,  // Đường dẫn ảnh logo watermark
    ],
];
```

---

## 🧩 Tích Hợp File Picker Vào Dự Án

### Cách 1: Gắn Tự Động Vào Nút Bấm (`KBTechFilePicker.attach`)

Cực kỳ tiện lợi cho các form CRUD thông thường:

```html
<div class="form-group">
  <label>Ảnh đại diện:</label>
  <div style="display: flex; gap: 12px; align-items: center;">
    <img id="avatar-preview" src="/placeholder.png" width="90" height="90" style="object-fit: cover; border-radius: 8px;">
    <input type="hidden" id="avatar-id" name="avatar_id">
    <button type="button" id="btn-pick-avatar" class="btn btn-primary">Chọn ảnh đại diện</button>
  </div>
</div>

<script src="/vendor/file-manager/picker.js"></script>
<script>
  KBTechFilePicker.attach('#btn-pick-avatar', {
    type: 'image',
    input: '#avatar-id',
    preview: '#avatar-preview'
  });
</script>
```

### Cách 2: Mở Hộp Thoại Thủ Công (`KBTechFilePicker.open`)

Hỗ trợ chọn nhiều tệp và nhận dữ liệu Callback:

```javascript
KBTechFilePicker.open({
  url: '/file-manager',
  type: 'image',           // 'image' | 'video' | 'audio' | 'document' | ''
  multiple: true,          // Cho phép chọn nhiều tệp
  onSelect: function (files) {
    console.log('Các tệp đã chọn:', files);
    files.forEach(file => {
      console.log(file.id, file.name, file.url, file.size);
    });
  }
});
```

### Cách 3: Tích Hợp Trình Soạn Thảo TinyMCE (5 / 6 / 7)

Chỉ cần khai báo 1 dòng trong cấu hình `tinymce.init`:

```javascript
tinymce.init({
  selector: '#editor',
  plugins: 'image media link code',
  toolbar: 'undo redo | formatselect | bold italic | link image media | code',
  file_picker_callback: KBTechFilePicker.tinyMCECallback
});
```

---

## 📡 Danh Sách API Endpoints

Tất cả API được bảo vệ bởi middleware xác thực của hệ thống và tuân thủ CSRF token:

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/file-manager` | Giao diện quản lý thư viện tài nguyên |
| `GET` | `/file-manager/media/{id}` | Phát trực tuyến nội dung media / file |
| `GET` | `/file-manager/api/nodes` | Danh sách tệp/thư mục kèm bộ lọc và thống kê |
| `GET` | `/file-manager/api/nodes/{id}/details` | Thông tin chi tiết chuyên sâu của 1 tài nguyên |
| `GET` | `/file-manager/api/tree` | Cây sơ đồ phân cấp thư mục |
| `POST` | `/file-manager/api/upload` | Tải lên đa tệp kèm kiểm tra định dạng và dung lượng |
| `POST` | `/file-manager/api/folders` | Tạo thư mục mới |
| `PATCH`| `/file-manager/api/nodes/{id}` | Đổi tên hoặc di chuyển tệp / thư mục |
| `POST` | `/file-manager/api/nodes/{id}/duplicate` | Nhân bản tệp tin (tạo bản copy mới) |
| `POST` | `/file-manager/api/nodes/{id}/transform` | Cắt (crop), đổi kích thước, chèn watermark ảnh |
| `DELETE`| `/file-manager/api/nodes/{id}` | Chuyển tệp vào thùng rác |
| `POST` | `/file-manager/api/nodes/{id}/restore` | Khôi phục tệp từ thùng rác |
| `DELETE`| `/file-manager/api/nodes/{id}/purge` | Xóa vĩnh viễn tệp và dữ liệu vật lý |
| `POST` | `/file-manager/api/batch/move` | Di chuyển hàng loạt tệp vào thư mục đích |
| `DELETE`| `/file-manager/api/batch/trash` | Chuyển hàng loạt tệp vào thùng rác |
| `POST` | `/file-manager/api/batch/restore` | Khôi phục hàng loạt tệp từ thùng rác |
| `DELETE`| `/file-manager/api/batch/purge` | Xóa vĩnh viễn hàng loạt tệp tin |
| `POST` | `/file-manager/api/batch/download` | Nén và tải xuống hàng loạt tệp thành file ZIP |
| `DELETE`| `/file-manager/api/trash/empty` | Dọn sạch toàn bộ thùng rác |
| `GET` | `/file-manager/api/nodes/{id}/grants` | Lấy danh sách phân quyền của tệp/thư mục |
| `PUT` | `/file-manager/api/nodes/{id}/grants` | Cấp hoặc cập nhật quyền cho người dùng |
| `DELETE`| `/file-manager/api/nodes/{id}/grants/{userId}` | Thu hồi quyền của người dùng |

---

## 🔒 Phân Quyền Với Laravel Gates

Đăng ký can thiệp phân quyền dễ dàng trong `AuthServiceProvider.php` của bạn:

```php
use App\Models\User;
use KBTech\FileManager\Models\Node;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    // Cấp toàn quyền cho Super Admin
    Gate::before(function (User $user, string $ability) {
        if ($user->isSuperAdmin()) {
            return true;
        }
    });

    // Tùy biến quyền xem tệp
    Gate::define('file-manager.view', function (User $user, ?Node $node) {
        if ($node === null) return true; // Thư mục gốc
        return $node->owner_id === (string)$user->id || $user->hasRole('editor');
    });

    // Tùy biến quyền tải lên
    Gate::define('file-manager.upload', function (User $user, ?Node $node) {
        return $user->can_upload_files ?? true;
    });
}
```

---

## 📄 Giấy Phép (License)

Dự án được phát hành theo giấy phép **[MIT License](LICENSE)**. Tự do sử dụng, chỉnh sửa và tích hợp vào các dự án cá nhân cũng như thương mại.

---

<p align="center">
  Phát triển với ❤️ bởi <b>Thees Beos & KBTech Team</b>
</p>