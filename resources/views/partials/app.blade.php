<svg class="svg-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></symbol>
    <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 11h18"/></symbol>
    <symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></symbol>
    <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></symbol>
    <symbol id="i-video" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
    <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></symbol>
    <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 16V3m-5 5 5-5 5 5M3 15v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
    <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></symbol>
    <symbol id="i-list" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></symbol>
    <symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v13m-5-5 5 5 5-5M3 16v5h18v-5"/></symbol>
    <symbol id="i-edit" viewBox="0 0 24 24"><path d="m16 3 5 5L8 21H3v-5ZM13 6l5 5"/></symbol>
    <symbol id="i-move" viewBox="0 0 24 24"><path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/></symbol>
    <symbol id="i-restore" viewBox="0 0 24 24"><path d="M3 11a9 9 0 1 1 3 8M3 4v7h7M12 7v5l3 2"/></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></symbol>
    <symbol id="i-spark" viewBox="0 0 24 24"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/></symbol>
    <symbol id="i-link" viewBox="0 0 24 24"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></symbol>
</defs></svg>

<div class="app-shell">
    <aside class="fm-sidebar sidebar" id="sidebar" aria-label="Điều hướng thư viện">
        <p class="nav-label">THƯ VIỆN</p>
        <nav class="main-nav">
            <button class="nav-item active" data-scope="all"><svg class="icon"><use href="#i-grid"/></svg>Tất cả tài nguyên<span class="nav-count" id="all-count">0</span></button>
            <button class="nav-item" data-scope="recent"><svg class="icon"><use href="#i-clock"/></svg>Gần đây</button>
            <button class="nav-item" data-scope="shared"><svg class="icon"><use href="#i-users"/></svg>Thư viện chung</button>
            <button class="nav-item" data-scope="private"><svg class="icon"><use href="#i-lock"/></svg>Thư viện riêng</button>
            <button class="nav-item" data-scope="trash"><svg class="icon"><use href="#i-trash"/></svg>Thùng rác<span class="nav-count" id="trash-count">0</span></button>
        </nav>
        <div class="nav-section-head"><p class="nav-label">THƯ MỤC CỦA BẠN</p><button class="icon-button" id="sidebar-new-folder" aria-label="Tạo thư mục"><svg class="icon"><use href="#i-plus"/></svg></button></div>
        <div id="folder-tree" class="folder-tree"></div>
        <div class="sidebar-bottom">
            <div class="storage-card">
                <div class="storage-heading"><svg class="icon"><use href="#i-folder"/></svg><span>Dung lượng lưu trữ</span></div>
                <div class="storage-track"><span id="storage-bar"></span></div>
                <p><strong id="storage-used">0 MB</strong><span id="storage-limit"> / 10 GB</span></p>
                <small>Tài nguyên trong tầm tay bạn.</small>
            </div>
            <div class="sidebar-signature"><span class="online-dot"></span>Được tạo bởi {{ $settings['brand']['name'] }}<span>v1.0</span></div>
        </div>
    </aside>

    <div class="sidebar-shade" id="sidebar-shade"></div>

    <div class="workspace">
        <header class="topbar">
            <button class="icon-button mobile-menu" id="menu-toggle" aria-label="Mở điều hướng"><svg class="icon"><use href="#i-menu"/></svg></button>
            <div class="topbar-breadcrumb">Không gian làm việc<svg class="icon"><use href="#i-chevron"/></svg><strong>Thư viện</strong></div>
            <div class="topbar-right">
                <span class="workspace-status"><span class="online-dot"></span>Không gian sáng tạo</span>
                <span class="topbar-divider"></span>
                <span class="avatar" title="{{ $settings['user']['name'] }}">{{ mb_substr($settings['user']['name'], 0, 1) }}</span>
            </div>
        </header>

        <main>
            <div class="page-heading">
                <div>
                    <div class="eyebrow"><span></span>YOUR CREATIVE SPACE</div>
                    <h1 id="page-title">Thư viện tài nguyên<span class="title-dot">.</span></h1>
                    <p id="page-description">Sắp xếp gọn gàng. Tìm kiếm dễ dàng. Sáng tạo không giới hạn.</p>
                </div>
                <div class="heading-actions">
                    <button class="button secondary" id="new-folder"><svg class="icon"><use href="#i-plus"/></svg>Tạo thư mục</button>
                    <button class="button primary" id="upload-button"><svg class="icon"><use href="#i-upload"/></svg>Tải lên file</button>
                </div>
            </div>

            <section class="upload-zone" id="dropzone" tabindex="0" role="button" aria-label="Kéo thả file hoặc nhấn để tải lên">
                <div class="upload-art"><svg class="icon"><use href="#i-upload"/></svg><span class="art-dot"></span></div>
                <div class="upload-copy"><strong>Một nơi cho mọi ý tưởng của bạn</strong><p>Kéo thả file vào đây, hoặc <span>chọn từ thiết bị</span></p></div>
                <div class="upload-hint"><span>Ảnh, tài liệu & video</span><small id="upload-limit">Tối đa 20 MB / file</small></div>
                <span class="drop-active-label">Thả file để tải lên</span>
            </section>

            <input id="file-input" type="file" multiple hidden>

            <section class="library-panel" aria-label="Danh sách tài nguyên">
                <div class="library-toolbar">
                    <div class="tabs" role="tablist" aria-label="Lọc theo loại file">
                        <button class="tab active" data-type="" role="tab" aria-selected="true">Tất cả <span class="tab-badge" id="count-all">0</span><span id="total-count" hidden>0</span></button>
                        <button class="tab" data-type="image" role="tab" aria-selected="false">Hình ảnh <span class="tab-badge" id="count-image">0</span></button>
                        <button class="tab" data-type="document" role="tab" aria-selected="false">Tài liệu <span class="tab-badge" id="count-document">0</span></button>
                        <button class="tab" data-type="video" role="tab" aria-selected="false">Video <span class="tab-badge" id="count-video">0</span></button>
                        <button class="tab" data-type="archive" role="tab" aria-selected="false">File nén <span class="tab-badge" id="count-archive">0</span></button>
                    </div>
                    <div class="toolbar-controls">
                        <label class="search-box">
                            <svg class="icon"><use href="#i-search"/></svg>
                            <input id="search" type="search" placeholder="Tìm kiếm tài nguyên…" aria-label="Tìm kiếm tài nguyên">
                            <kbd>/</kbd>
                        </label>
                    </div>
                </div>

                <div class="content-toolbar">
                    <div class="breadcrumbs" id="breadcrumbs"><button>Tất cả tài nguyên</button></div>
                    <div class="sort-view">
                        <select id="sort" aria-label="Sắp xếp">
                            <option value="newest">Mới nhất trước</option>
                            <option value="oldest">Cũ nhất trước</option>
                            <option value="name">Tên A → Z</option>
                            <option value="size">Dung lượng lớn nhất</option>
                        </select>
                        <div class="view-toggle">
                            <button class="icon-button active" id="grid-view" aria-label="Chế độ lưới" aria-pressed="true"><svg class="icon"><use href="#i-grid"/></svg></button>
                            <button class="icon-button" id="list-view" aria-label="Chế độ danh sách" aria-pressed="false"><svg class="icon"><use href="#i-list"/></svg></button>
                        </div>
                    </div>
                </div>

                <div id="selection-bar" class="selection-bar" hidden>
                    <label><input id="select-all" type="checkbox"> <strong id="selected-count">0 file đã chọn</strong></label>
                    <div>
                        <button class="text-button" id="batch-move"><svg class="icon"><use href="#i-move"/></svg>Di chuyển</button>
                        <button class="text-button danger" id="batch-trash"><svg class="icon"><use href="#i-trash"/></svg>Thùng rác</button>
                        <button class="text-button" id="clear-selection">Bỏ chọn</button>
                    </div>
                </div>

                <div class="list-heading" id="list-heading" hidden>
                    <span>Tên tài nguyên</span><span>Loại</span><span>Dung lượng</span><span>Ngày cập nhật</span>
                </div>

                <div id="content" class="file-grid" aria-live="polite" aria-busy="true"></div>

                <div class="panel-footer">
                    <span id="result-summary">Đang tải tài nguyên…</span>
                    <div id="pagination"></div>
                    <span class="secure-note"><svg class="icon"><use href="#i-lock"/></svg>Lưu trữ an toàn</span>
                </div>
            </section>

            <footer class="page-footer">
                <span>Mỗi tài nguyên, một câu chuyện.</span>
                <span>{{ $settings['brand']['name'] }} Media Library</span>
            </footer>
        </main>
    </div>
</div>

<div id="picker-footer" class="picker-footer" hidden>
    <div>
        <strong>Chọn tài nguyên cho nội dung của bạn</strong>
        <span id="picker-count">Chưa chọn file nào</span>
    </div>
    <button class="button primary" id="confirm-picker" disabled><svg class="icon"><use href="#i-check"/></svg>Sử dụng file đã chọn</button>
</div>

<aside id="uploads" class="upload-queue" hidden aria-label="Tiến trình tải lên">
    <div class="queue-heading">
        <strong id="queue-title">Đang tải lên</strong>
        <button class="icon-button" id="close-queue" aria-label="Đóng tiến trình"><svg class="icon"><use href="#i-close"/></svg></button>
    </div>
    <div id="queue-items"></div>
</aside>

<div id="toast-region" class="toast-region" role="status" aria-live="polite"></div>

<dialog id="modal" class="fm-modal modal">
    <div class="modal-head">
        <div>
            <span id="modal-eyebrow" class="eyebrow">MEDIA WORKSPACE</span>
            <h2 id="modal-title"></h2>
        </div>
        <button class="icon-button" id="close-modal" aria-label="Đóng cửa sổ"><svg class="icon"><use href="#i-close"/></svg></button>
    </div>
    <div id="modal-body"></div>
    <div id="modal-actions" class="modal-actions"></div>
</dialog>
