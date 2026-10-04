(() => {
  'use strict';

  const settingsEl = document.getElementById('fm-settings');
  if (!settingsEl) return;
  const config = JSON.parse(settingsEl.textContent);

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const bytes = (n) => {
    if (!n) return '0 KB';
    const i = Math.min(3, Math.floor(Math.log(n) / Math.log(1024)));
    return `${(n / 1024 ** i).toLocaleString('vi-VN', {maximumFractionDigits: i < 2 ? 0 : 1})} ${['B','KB','MB','GB'][i]}`;
  };
  const date = (s) => new Date(s).toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});

  let savedView = 'grid';
  let savedInspector = false;
  try {
    savedView = localStorage.getItem('kbtech:media:view') || 'grid';
    savedInspector = localStorage.getItem('kbtech:media:inspector') === '1';
  } catch (_) {}

  const state = {
    scope: 'all',
    parent: null,
    type: config.pickerType || '',
    q: '',
    sort: 'newest',
    page: 1,
    view: savedView,
    inspectorOpen: savedInspector && !config.picker,
    activeItem: null,
    items: [],
    tree: [],
    selected: new Map(),
    loading: false,
    canUpload: config.canUpload
  };

  let requestId = 0, searchTimer, activeRequest;

  if (/^#[0-9a-f]{6}$/i.test(config.brand?.color)) {
    document.documentElement.style.setProperty('--brand', config.brand.color);
    document.documentElement.style.setProperty('--brand-soft', `${config.brand.color}18`);
  }

  $('upload-limit').textContent = `Tối đa ${bytes(config.upload.maxKb * 1024)} / file`;
  $('file-input').accept = config.upload.extensions.map((x) => `.${x}`).join(',');

  if (config.picker) {
    document.body.classList.add('picker-mode');
    $('picker-footer').hidden = false;
    $('toggle-inspector').hidden = true;
  }
  if (config.pickerType) {
    document.querySelectorAll('[data-type]').forEach((el) => {
      el.hidden = el.dataset.type !== config.pickerType;
    });
  }

  function toast(message, error = false) {
    const el = document.createElement('div');
    el.className = `toast${error ? ' error' : ''}`;
    el.textContent = message;
    $('toast-region').append(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 350);
    }, 4500);
  }

  async function api(path, method = 'GET', data, signal) {
    const isFormData = data instanceof FormData;
    const headers = {
      'Accept': 'application/json',
      'X-CSRF-TOKEN': config.csrf,
      ...(!isFormData && data !== undefined ? {'Content-Type': 'application/json'} : {})
    };
    const body = isFormData ? data : (data !== undefined ? JSON.stringify(data) : undefined);

    const response = await fetch(`${config.base}/api/${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers,
      body
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = response.status === 419
        ? 'Phiên làm việc đã hết hạn. Hãy tải lại trang.'
        : response.status === 401
          ? 'Vui lòng đăng nhập lại.'
          : Object.values(result.errors || {}).flat()[0] || result.message || `Không thể thực hiện thao tác (${response.status}).`;
      throw new Error(message);
    }
    return result;
  }

  function clearSelection() {
    state.selected.clear();
    renderSelection();
  }

  function nav(scope, parent = null) {
    state.scope = scope;
    state.parent = parent;
    state.page = 1;
    state.q = '';
    $('search').value = '';
    $('search-clear').hidden = true;
    clearSelection();
    $('sidebar').classList.remove('open');
    $('sidebar-shade').classList.remove('open');
    load();
    syncSidebar();
  }

  function typeOf(item) {
    if (item.kind === 'folder') return 'folder';
    const ext = (item.extension || '').toLowerCase();
    const mime = item.mime || '';
    if (mime.startsWith('image/') || ['jpg','jpeg','png','webp','gif','svg','bmp','avif'].includes(ext)) return 'image';
    if (mime.startsWith('video/') || ['mp4','webm','mov','avi','mkv','m4v'].includes(ext)) return 'video';
    if (mime.startsWith('audio/') || ['mp3','wav','ogg','m4a','flac','aac'].includes(ext)) return 'audio';
    if (['zip','rar','tar','gz','7z'].includes(ext)) return 'archive';
    if (['json','js','ts','css','html','php','sql','md','txt','log','xml','yaml','yml'].includes(ext)) return 'code';
    return 'document';
  }

  function select(item, checked) {
    if (item.kind === 'folder' || item.deleted_at) return;
    if (checked && config.picker && !config.multiple) state.selected.clear();
    if (checked) {
      state.selected.set(item.id, item);
      state.activeItem = item;
    } else {
      state.selected.delete(item.id);
      if (state.activeItem?.id === item.id) {
        state.activeItem = state.selected.size ? [...state.selected.values()].at(-1) : null;
      }
    }
    renderSelection();
    if (state.inspectorOpen) updateInspector();
  }

  function renderSelection() {
    const count = state.selected.size;
    const isTrash = state.scope === 'trash';
    $('selected-count').textContent = `${count} file đã chọn`;
    $('selection-bar').hidden = !count || config.picker;
    $('content').classList.toggle('selection-mode', !!count);

    $('batch-normal-actions').hidden = isTrash;
    $('batch-trash-actions').hidden = !isTrash;

    document.querySelectorAll('[data-card]').forEach((el) => {
      const checked = state.selected.has(Number(el.dataset.card));
      el.classList.toggle('selected', checked);
      const cb = el.querySelector('.card-checkbox');
      if (cb) cb.checked = checked;
    });

    const selectable = state.items.filter((x) => x.kind === 'file' && !x.deleted_at);
    $('select-all').checked = selectable.length > 0 && selectable.every((x) => state.selected.has(x.id));

    $('batch-move').disabled = [...state.selected.values()].some((x) => !x.permissions.update);
    $('batch-trash').disabled = [...state.selected.values()].some((x) => !x.permissions.delete);
    if ($('batch-restore')) $('batch-restore').disabled = [...state.selected.values()].some((x) => !x.permissions.delete);
    if ($('batch-purge')) $('batch-purge').disabled = [...state.selected.values()].some((x) => !x.permissions.delete);

    $('picker-count').textContent = count ? `${count} file đã chọn` : 'Chưa chọn file nào';
    $('confirm-picker').disabled = !count;
  }

  async function load(refreshTree = false) {
    const id = ++requestId;
    activeRequest?.abort();
    activeRequest = new AbortController();
    state.loading = true;
    $('content').setAttribute('aria-busy', 'true');

    if (!state.items.length) {
      $('content').innerHTML = Array.from({length: 8}, () => '<div class="skeleton"></div>').join('');
    } else {
      $('content').classList.add('is-loading');
    }

    const query = new URLSearchParams({
      scope: state.scope,
      sort: state.sort,
      page: state.page,
      per_page: 40
    });
    if (state.parent) query.set('parent_id', state.parent);
    if (state.type) query.set('type', state.type);
    if (state.q) query.set('q', state.q);

    try {
      const result = await api(`nodes?${query}`, 'GET', undefined, activeRequest.signal);
      if (id !== requestId) return;
      state.items = result.data;
      state.canUpload = result.can_upload;

      renderItems(result);
      renderNavigation(result);
      renderPagination(result.meta);

      if (refreshTree || !state.tree.length) await loadTree();
      if (state.inspectorOpen) updateInspector();
    } catch (error) {
      if (error.name === 'AbortError' || id !== requestId) return;
      $('content').innerHTML = `<div class="empty-state">${icon('folder')}<h3>Chưa thể tải thư viện</h3><p>${esc(error.message)}</p><button class="button secondary" id="retry-load">Thử lại</button></div>`;
      $('retry-load').onclick = () => load();
      $('result-summary').textContent = 'Không thể tải dữ liệu';
    } finally {
      if (id === requestId) {
        state.loading = false;
        $('content').setAttribute('aria-busy', 'false');
        $('content').classList.remove('is-loading');
      }
    }
  }

  async function loadTree() {
    try {
      state.tree = (await api('tree')).data;
      renderTree();
    } catch (error) {
      toast(error.message, true);
    }
  }

  function renderTree() {
    const depth = (item) => {
      let d = 0, parent = item.parent_id;
      const seen = new Set();
      while (parent && !seen.has(parent)) {
        seen.add(parent);
        d++;
        parent = state.tree.find((n) => n.id === parent)?.parent_id;
      }
      return Math.min(d, 5);
    };
    const ordered = [];
    const append = (parent) => {
      state.tree.filter((x) => x.parent_id === parent).forEach((x) => {
        if (ordered.some((n) => n.id === x.id)) return;
        ordered.push(x);
        append(x.id);
      });
    };
    append(null);
    state.tree.forEach((x) => {
      if (!ordered.includes(x)) ordered.push(x);
    });

    $('folder-tree').innerHTML = ordered.length
      ? ordered.map((x) => `<button class="tree-item${state.parent === x.id ? ' active' : ''}" data-folder="${x.id}" style="padding-left:${13 + depth(x) * 12}px">${icon('folder')}<span>${esc(x.name)}</span></button>`).join('')
      : '<div class="tree-empty">Tạo thư mục đầu tiên của bạn</div>';

    $('folder-tree').querySelectorAll('[data-folder]').forEach((el) => {
      const folderId = Number(el.dataset.folder);
      el.onclick = () => nav('all', folderId);

      // Drag and drop into folder in tree
      el.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-hover');
      };
      el.ondragleave = () => el.classList.remove('drag-hover');
      el.ondrop = async (e) => {
        e.preventDefault();
        el.classList.remove('drag-hover');
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        try {
          const {ids} = JSON.parse(raw);
          if (!ids || !ids.length) return;
          await batchMove(ids, folderId);
        } catch (_) {}
      };
    });
  }

  function renderNavigation(result) {
    const titles = {all: 'Thư viện tài nguyên', shared: 'Thư viện chung', private: 'Thư viện riêng', recent: 'Tài nguyên gần đây', trash: 'Thùng rác'};
    const parent = result.breadcrumbs.at(-1);

    $('page-title').innerHTML = `${esc(parent?.name || titles[state.scope])}<span class="title-dot">.</span>`;
    $('page-description').textContent = state.scope === 'trash'
      ? 'Khôi phục tài nguyên đã xóa hoặc dọn dẹp thư viện của bạn.'
      : state.scope === 'private'
        ? 'Không gian riêng cho tài nguyên của bạn và người được cấp quyền.'
        : 'Sắp xếp gọn gàng. Tìm kiếm dễ dàng. Sáng tạo không giới hạn.';

    document.querySelectorAll('[data-scope]').forEach((el) => {
      el.classList.toggle('active', el.dataset.scope === state.scope && !state.parent);
    });

    $('all-count').textContent = result.stats.files;
    $('trash-count').textContent = result.stats.trash;
    $('storage-used').textContent = bytes(result.stats.bytes);
    $('storage-limit').textContent = config.quota ? ` / ${bytes(config.quota)}` : ' / Không giới hạn';
    $('storage-bar').style.width = `${config.quota ? Math.min(100, result.stats.bytes / config.quota * 100) : 0}%`;
    $('total-count').textContent = result.meta.total;

    if (result.counts) {
      const allCount = (!state.parent && !state.type) ? result.meta.total : result.counts.all;
      if ($('count-all')) $('count-all').textContent = allCount.toLocaleString('vi-VN');
      if ($('count-image')) $('count-image').textContent = (result.counts.image ?? 0).toLocaleString('vi-VN');
      if ($('count-video')) $('count-video').textContent = (result.counts.video ?? 0).toLocaleString('vi-VN');
      if ($('count-audio')) $('count-audio').textContent = (result.counts.audio ?? 0).toLocaleString('vi-VN');
      if ($('count-document')) $('count-document').textContent = (result.counts.document ?? 0).toLocaleString('vi-VN');
      if ($('count-archive')) $('count-archive').textContent = (result.counts.archive ?? 0).toLocaleString('vi-VN');
    }

    $('upload-button').disabled = !state.canUpload;
    $('new-folder').disabled = !state.canUpload;
    $('sidebar-new-folder').disabled = !state.canUpload;
    $('dropzone').hidden = !state.canUpload || state.scope === 'trash';

    // Show/hide empty trash button
    if ($('empty-trash-btn')) {
      $('empty-trash-btn').hidden = state.scope !== 'trash' || result.stats.trash === 0;
    }

    $('breadcrumbs').innerHTML = `<button data-crumb="">${esc(titles[state.scope])}</button>`
      + result.breadcrumbs.map((x) => `${icon('chevron')}<button data-crumb="${x.id}">${esc(x.name)}</button>`).join('')
      + (state.q ? `${icon('chevron')}<span>Kết quả tìm kiếm: “${esc(state.q)}”</span>` : '');

    $('breadcrumbs').querySelectorAll('[data-crumb]').forEach((el) => {
      el.onclick = () => nav(state.scope, Number(el.dataset.crumb) || null);
    });

    document.querySelectorAll('[data-type]').forEach((el) => {
      const active = el.dataset.type === state.type;
      el.classList.toggle('active', active);
      el.setAttribute('aria-selected', String(active));
    });

    $('folder-tree')?.querySelectorAll('.tree-item').forEach((el) => {
      el.classList.toggle('active', state.parent === Number(el.dataset.folder));
    });
  }

  function renderItems(result) {
    const content = $('content');
    content.classList.toggle('list-mode', state.view === 'list');
    content.classList.remove('is-loading');
    $('list-heading').hidden = state.view !== 'list';
    $('grid-view').classList.toggle('active', state.view !== 'list');
    $('grid-view').setAttribute('aria-pressed', String(state.view !== 'list'));
    $('list-view').classList.toggle('active', state.view === 'list');
    $('list-view').setAttribute('aria-pressed', String(state.view === 'list'));

    if (!state.items.length) {
      content.innerHTML = `<div class="empty-state">${icon(state.scope === 'trash' ? 'trash' : 'folder')}<h3>${state.q ? 'Không tìm thấy tài nguyên' : state.scope === 'trash' ? 'Thùng rác đang trống' : 'Không gian cho ý tưởng mới'}</h3><p>${state.q ? 'Thử một từ khóa khác hoặc thay đổi bộ lọc.' : state.scope === 'trash' ? 'Các tài nguyên đã xóa sẽ xuất hiện ở đây để bạn có thể khôi phục.' : 'Tải lên file hoặc tạo thư mục để bắt đầu sắp xếp tài nguyên của bạn.'}</p>${state.canUpload ? '<button class="button primary" id="empty-upload">Tải lên file đầu tiên</button>' : ''}</div>`;
      if ($('empty-upload')) $('empty-upload').onclick = () => $('file-input').click();
    } else {
      const cards = state.items.map((item) => {
        const folder = item.kind === 'folder';
        const type = typeOf(item);

        let previewMarkup = '';
        if (folder) {
          previewMarkup = `<div class="folder-tile">${icon('folder')}</div>`;
        } else if (type === 'image') {
          previewMarkup = `<div class="file-preview image">${item.thumbnail_url || item.url ? `<img src="${esc(item.thumbnail_url || item.url)}" alt="${esc(item.name)}" loading="lazy">` : icon('image', 'large-icon')}<span class="extension-badge">${esc(item.extension)}</span></div>`;
        } else if (type === 'audio') {
          previewMarkup = `<div class="file-preview audio">${icon('audio', 'large-icon')}<span class="extension-badge">${esc(item.extension)}</span></div>`;
        } else if (type === 'video') {
          previewMarkup = `<div class="file-preview video">${item.thumbnail_url ? `<img src="${esc(item.thumbnail_url)}" alt="${esc(item.name)}" loading="lazy">` : icon('video', 'large-icon')}<span class="extension-badge">${esc(item.extension)}</span></div>`;
        } else {
          previewMarkup = `<div class="file-preview ${type}">${icon(type === 'archive' ? 'folder' : type === 'code' ? 'file' : 'file', 'large-icon')}<span class="extension-badge">${esc(item.extension)}</span></div>`;
        }

        const meta = state.view === 'list'
          ? `<span class="list-type">${folder ? 'Thư mục' : esc(item.extension?.toUpperCase())}</span><span class="list-size">${folder ? '—' : bytes(item.size)}</span><span class="list-date">${date(item.updated_at)}</span>`
          : `<div class="file-meta"><span>${folder ? 'Thư mục' : bytes(item.size)}</span><span class="private-indicator">${icon(item.visibility === 'private' ? 'lock' : 'users')}${item.visibility === 'private' ? 'Riêng tư' : 'Chung'}</span></div>`;

        return `<article class="file-card${folder ? ' folder-card' : ''}" data-card="${item.id}" tabindex="0" draggable="${!item.deleted_at}" aria-label="${esc(item.name)}">${!folder && !item.deleted_at ? `<input class="card-checkbox" type="checkbox" aria-label="Chọn ${esc(item.name)}">` : ''}${previewMarkup}<div class="file-card-info"><div class="file-name-row"><span class="file-name" title="${esc(item.name)}">${esc(item.name)}</span><button class="card-menu icon-button" aria-label="Thao tác với ${esc(item.name)}">${icon('more')}</button></div>${meta}</div></article>`;
      });

      const folders = cards.filter((_, i) => state.items[i].kind === 'folder').join('');
      const files = cards.filter((_, i) => state.items[i].kind !== 'folder').join('');
      content.innerHTML = (folders ? `<div class="folder-group">${folders}</div>` : '') + files;

      content.querySelectorAll('[data-card]').forEach((card) => {
        const item = state.items.find((x) => x.id === Number(card.dataset.card));
        if (!item) return;

        const activate = () => {
          if (item.deleted_at) {
            contextMenu(item, card.querySelector('.card-menu'));
          } else if (item.kind === 'folder') {
            nav('all', item.id);
          } else if (config.picker) {
            select(item, !state.selected.has(item.id));
          } else {
            state.activeItem = item;
            if (state.inspectorOpen) updateInspector();
            else preview(item);
          }
        };

        // Click on card
        card.onclick = (event) => {
          if (!event.target.closest('button,input')) {
            activate();
          }
        };

        // Double click to always open preview
        card.ondblclick = (event) => {
          if (!event.target.closest('button,input') && item.kind === 'file') {
            preview(item);
          }
        };

        // Right-click context menu
        card.oncontextmenu = (event) => {
          event.preventDefault();
          contextMenu(item, event);
        };

        // Keyboard navigation
        card.onkeydown = (event) => {
          if (event.target !== card) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            activate();
          }
          if (event.key === ' ' && item.kind === 'file') {
            event.preventDefault();
            select(item, !state.selected.has(item.id));
          }
        };

        // Checkbox
        const check = card.querySelector('.card-checkbox');
        if (check) {
          check.onchange = () => select(item, check.checked);
        }

        // More menu button
        card.querySelector('.card-menu').onclick = (event) => {
          event.stopPropagation();
          contextMenu(item, event.currentTarget);
        };

        // Drag and drop mechanics for cards
        card.ondragstart = (event) => {
          const ids = state.selected.has(item.id) ? [...state.selected.keys()] : [item.id];
          event.dataTransfer.setData('application/json', JSON.stringify({id: item.id, ids}));
          event.dataTransfer.effectAllowed = 'move';
        };

        if (item.kind === 'folder') {
          card.ondragover = (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            card.classList.add('drop-target');
          };
          card.ondragleave = () => card.classList.remove('drop-target');
          card.ondrop = async (event) => {
            event.preventDefault();
            card.classList.remove('drop-target');
            const raw = event.dataTransfer.getData('application/json');
            if (!raw) return;
            try {
              const {ids} = JSON.parse(raw);
              if (!ids || !ids.length || ids.includes(item.id)) return;
              await batchMove(ids, item.id);
            } catch (_) {}
          };
        }

        // Fallback for broken images
        card.querySelector('img')?.addEventListener('error', (event) => {
          event.target.style.display = 'none';
          const prev = event.target.closest('.file-preview');
          if (prev && !prev.querySelector('.large-icon')) {
            prev.insertAdjacentHTML('afterbegin', icon('image', 'large-icon'));
          }
        });
      });
    }

    renderSelection();
    const total = result.meta.total;
    const start = total ? (state.page - 1) * result.meta.per_page + 1 : 0;
    if ($('result-summary')) {
      $('result-summary').textContent = total
        ? `Hiển thị ${start}–${Math.min(start + state.items.length - 1, total)} trong ${total} tài nguyên`
        : 'Chưa có tài nguyên';
    }
  }

  function renderPagination(meta) {
    $('pagination').innerHTML = meta.last_page > 1
      ? `<div class="pagination"><button class="page-button" data-page="${meta.page - 1}" ${meta.page <= 1 ? 'disabled' : ''}>←</button><span class="page-button active">${meta.page} / ${meta.last_page}</span><button class="page-button" data-page="${meta.page + 1}" ${meta.page >= meta.last_page ? 'disabled' : ''}>→</button></div>`
      : '';

    $('pagination').querySelectorAll('[data-page]').forEach((el) => {
      el.onclick = () => {
        const pageNum = Number(el.dataset.page);
        if (el.disabled || isNaN(pageNum) || pageNum < 1 || pageNum > meta.last_page) return;
        state.page = pageNum;
        load();
      };
    });
  }

  let menu;
  function closeMenu() {
    menu?.remove();
    menu = null;
  }

  function contextMenu(item, anchorOrEvent) {
    closeMenu();
    menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.setAttribute('role', 'menu');

    const actions = [];
    if (item.deleted_at) {
      if (item.permissions.delete) {
        actions.push(['restore', 'Khôi phục', () => mutate(`nodes/${item.id}/restore`, 'POST', undefined, 'Đã khôi phục tài nguyên.')]);
        actions.push(['trash', 'Xóa vĩnh viễn', () => confirmAction('Xóa vĩnh viễn?', `“${item.name}” sẽ bị xóa vĩnh viễn cùng mọi tài nguyên bên trong. Bạn không thể khôi phục thao tác này.`, () => mutate(`nodes/${item.id}/purge`, 'DELETE', undefined, 'Đã xóa vĩnh viễn.'), true), true]);
      }
    } else {
      if (item.kind === 'file') {
        actions.push(['image', 'Xem trước', () => preview(item)]);
        actions.push(['info', 'Chi tiết tài nguyên', () => { state.activeItem = item; openInspector(); }]);
        actions.push(['link', 'Sao chép URL', () => copyToClipboard(item.url, 'Đã sao chép liên kết tài nguyên.')]);
        actions.push(['download', 'Tải xuống', () => download(item)]);
        if (item.permissions.update) {
          actions.push(['copy', 'Nhân bản', () => duplicate(item)]);
        }
      }
      if (item.permissions.update) {
        actions.push(['edit', 'Đổi tên', () => rename(item)]);
        actions.push(['move', 'Di chuyển', () => move([item])]);
        if (typeOf(item) === 'image') actions.push(['spark', 'Chỉnh sửa ảnh', () => editor(item)]);
      }
      if (item.permissions.share) actions.push(['users', 'Phân quyền', () => grants(item)]);
      if (item.permissions.delete) actions.push(['trash', 'Chuyển vào thùng rác', () => trash([item])]);
    }

    if (!actions.length) actions.push(['lock', 'Bạn chỉ có quyền xem', () => {}]);

    menu.innerHTML = actions.map(([name, label], i) => `<button role="menuitem" data-action="${i}" class="${name === 'trash' ? 'danger' : ''}">${icon(name)}${esc(label)}</button>`).join('');
    document.body.append(menu);

    let left = 0, top = 0;
    if (anchorOrEvent instanceof MouseEvent) {
      left = Math.max(8, Math.min(anchorOrEvent.clientX, innerWidth - menu.offsetWidth - 8));
      top = Math.max(8, Math.min(anchorOrEvent.clientY, innerHeight - menu.offsetHeight - 8));
    } else {
      const rect = anchorOrEvent.getBoundingClientRect();
      left = Math.max(8, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8));
      top = Math.max(8, Math.min(rect.bottom + 5, innerHeight - menu.offsetHeight - 8));
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    menu.querySelectorAll('[data-action]').forEach((el) => {
      el.onclick = () => {
        const action = actions[Number(el.dataset.action)][2];
        closeMenu();
        action();
      };
    });
    menu.querySelector('button')?.focus();
  }

  document.addEventListener('click', (event) => {
    if (menu && !menu.contains(event.target) && !event.target.closest('.card-menu')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  function modal(title, body, actions = [], wide = false) {
    if ($('modal').open) $('modal').close();
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = body;
    $('modal-actions').innerHTML = '';
    $('modal').classList.toggle('wide', wide);

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = `button ${action.kind || 'secondary'}`;
      btn.textContent = action.label;
      btn.onclick = async () => {
        $('modal-body').querySelector('.form-error')?.remove();
        btn.disabled = true;
        try {
          await action.run();
        } catch (error) {
          const el = document.createElement('div');
          el.className = 'form-error';
          el.setAttribute('role', 'alert');
          el.textContent = error.message;
          $('modal-body').append(el);
        } finally {
          btn.disabled = false;
        }
      };
      $('modal-actions').append(btn);
    }
    $('modal').showModal();
  }

  const cancel = {label: 'Hủy', run: () => $('modal').close()};

  function confirmAction(title, message, run, permanent = false) {
    modal(title, `<p class="modal-body-text">${esc(message)}</p>`, [
      cancel,
      {
        label: permanent ? 'Xóa vĩnh viễn' : 'Xác nhận',
        kind: permanent ? 'danger-button' : 'primary',
        run: async () => {
          await run();
          $('modal').close();
        }
      }
    ]);
  }

  async function mutate(path, method, data, message) {
    await api(path, method, data);
    clearSelection();
    toast(message);
    await load(true);
  }

  function folder() {
    const parent = state.tree.find((x) => x.id === state.parent);
    modal('Tạo thư mục mới', `<label class="field"><span>Tên thư mục</span><input id="folder-name" maxlength="255" placeholder="Ví dụ: Tài nguyên dự án" autofocus></label>${parent ? `<p class="modal-body-text">Tạo bên trong “${esc(parent.name)}”. Kế thừa chế độ ${parent.visibility === 'shared' ? 'chung' : 'riêng tư'}.</p>` : `<label class="field"><span>Không gian lưu trữ</span><select id="folder-visibility"><option value="shared" ${state.scope !== 'private' ? 'selected' : ''}>Thư viện chung</option><option value="private" ${state.scope === 'private' ? 'selected' : ''}>Thư viện riêng</option></select></label>`}`, [
      cancel,
      {
        label: 'Tạo thư mục',
        kind: 'primary',
        run: async () => {
          const name = $('folder-name').value.trim();
          if (!name) throw new Error('Vui lòng nhập tên thư mục.');
          await mutate('folders', 'POST', {
            name,
            parent_id: state.parent,
            visibility: parent?.visibility || $('folder-visibility').value
          }, 'Đã tạo thư mục.');
          $('modal').close();
        }
      }
    ]);
    $('folder-name').focus();
  }

  function rename(item) {
    modal('Đổi tên tài nguyên', `<label class="field"><span>Tên mới</span><input id="rename-name" maxlength="255" value="${esc(item.name)}"></label>${item.kind === 'file' ? '<p class="modal-body-text">Giữ nguyên phần mở rộng của file để tránh lỗi định dạng.</p>' : ''}`, [
      cancel,
      {
        label: 'Lưu thay đổi',
        kind: 'primary',
        run: async () => {
          const name = $('rename-name').value.trim();
          if (!name) throw new Error('Vui lòng nhập tên.');
          await mutate(`nodes/${item.id}`, 'PATCH', {name}, 'Đã đổi tên tài nguyên.');
          $('modal').close();
        }
      }
    ]);
    $('rename-name').focus();
    $('rename-name').setSelectionRange(0, item.kind === 'file' ? item.name.lastIndexOf('.') : item.name.length);
  }

  function isDescendant(folderNode, ids) {
    const seen = new Set();
    let current = folderNode;
    while (current && !seen.has(current.id)) {
      if (ids.includes(current.id)) return true;
      seen.add(current.id);
      current = state.tree.find((x) => x.id === current.parent_id);
    }
    return false;
  }

  function folderPath(item) {
    let path = item.name, parent = item.parent_id;
    const seen = new Set([item.id]);
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      const node = state.tree.find((x) => x.id === parent);
      if (!node) break;
      path = `${node.name} / ${path}`;
      parent = node.parent_id;
    }
    return path;
  }

  async function move(items) {
    if (!items.length) return;
    if (items.some((x) => x.visibility !== items[0].visibility)) {
      toast('Hãy chọn các tài nguyên cùng không gian chung hoặc riêng.', true);
      return;
    }
    await loadTree();
    const ids = items.map((x) => x.id);
    const folders = state.tree.filter((x) => x.permissions.upload && x.visibility === items[0].visibility && !isDescendant(x, ids));

    modal('Di chuyển tài nguyên', `<p class="modal-body-text">Chọn thư mục đích cho ${items.length} tài nguyên. Chế độ chung/riêng được giữ nguyên.</p><label class="field" style="margin-top:18px"><span>Thư mục đích</span><select id="move-target"><option value="">Thư mục gốc</option>${folders.map((x) => `<option value="${x.id}">${esc(folderPath(x))}</option>`).join('')}</select></label>`, [
      cancel,
      {
        label: 'Di chuyển',
        kind: 'primary',
        run: async () => {
          const targetId = Number($('move-target').value) || null;
          await batchMove(ids, targetId);
          $('modal').close();
        }
      }
    ]);
  }

  async function batchMove(ids, targetFolderId) {
    try {
      const result = await api('batch/move', 'POST', {ids, parent_id: targetFolderId});
      clearSelection();
      await load(true);
      toast(`Đã di chuyển ${result.moved_count ?? ids.length} tài nguyên.`);
    } catch (e) {
      toast(e.message, true);
    }
  }

  function trash(items) {
    if (!items.length) return;
    confirmAction('Chuyển vào thùng rác?', items.length === 1 ? `“${items[0].name}” sẽ được chuyển vào thùng rác. Bạn có thể khôi phục sau.` : `${items.length} tài nguyên sẽ được chuyển vào thùng rác. Bạn có thể khôi phục sau.`, async () => {
      const ids = items.map((x) => x.id);
      try {
        const result = await api('batch/trash', 'DELETE', {ids});
        clearSelection();
        toast(`Đã chuyển ${result.trashed_count ?? ids.length} tài nguyên vào thùng rác.`);
        await load(true);
      } catch (e) {
        clearSelection();
        toast(e.message, true);
        await load(true);
      }
    });
  }

  async function duplicate(item) {
    try {
      await api(`nodes/${item.id}/duplicate`, 'POST');
      toast(`Đã nhân bản “${item.name}”.`);
      await load();
    } catch (e) {
      toast(e.message, true);
    }
  }

  function download(item) {
    const link = document.createElement('a');
    const url = new URL(item.url, location.origin);
    url.searchParams.set('download', '1');
    link.href = url.href;
    link.download = item.name;
    document.body.append(link);
    link.click();
    link.remove();
  }

  async function batchDownload(items) {
    if (!items.length) return;
    toast('Đang nén các tệp thành gói ZIP, vui lòng đợi...');
    try {
      const ids = items.map((x) => x.id);
      const response = await fetch(`${config.base}/api/batch/download`, {
        method: 'POST',
        headers: {
          'Accept': 'application/zip',
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': config.csrf
        },
        body: JSON.stringify({ids})
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || 'Không thể tạo tệp nén ZIP.');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `resources_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast('Tải xuống file nén ZIP thành công.');
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function copyToClipboard(text, successMsg = 'Đã sao chép vào bộ nhớ tạm.') {
    try {
      await navigator.clipboard.writeText(text);
      toast(successMsg);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(successMsg);
    }
  }

  async function preview(item) {
    const type = typeOf(item);
    let media = '';

    if (type === 'image') {
      media = `<img src="${esc(item.url)}" alt="${esc(item.name)}" style="max-height:65vh;object-fit:contain">`;
    } else if (type === 'video') {
      media = `<video src="${esc(item.url)}" controls playsinline autoplay style="max-height:65vh;width:100%"></video>`;
    } else if (type === 'audio') {
      media = `<div style="padding:30px 10px;text-align:center">${icon('audio', 'large-icon')}<h4 style="margin:16px 0 8px">${esc(item.name)}</h4><audio src="${esc(item.url)}" controls autoplay style="width:100%;max-width:440px;margin-top:12px"></audio></div>`;
    } else if (type === 'code') {
      let codeText = 'Đang tải nội dung tệp...';
      try {
        const res = await fetch(item.url);
        if (res.ok) codeText = await res.text();
      } catch (_) {
        codeText = 'Không thể xem trực tiếp nội dung.';
      }
      media = `<pre class="code-preview-block"><code>${esc(codeText.slice(0, 15000))}</code></pre>`;
    } else if (item.extension === 'pdf') {
      media = `<iframe src="${esc(item.url)}" style="width:100%;height:65vh;border:none;border-radius:8px"></iframe>`;
    } else {
      media = `${icon('file', 'large-icon')}<p class="modal-body-text">Tải xuống để xem nội dung ${esc(item.extension?.toUpperCase())}.</p>`;
    }

    modal(item.name, `<div class="preview-layout"><div class="modal-preview">${media}</div><div><div class="preview-info"><div><span>Loại file</span><strong>${esc(item.mime || item.extension?.toUpperCase())}</strong></div><div><span>Dung lượng</span><strong>${bytes(item.size)}</strong></div>${item.width ? `<div><span>Kích thước</span><strong>${item.width} × ${item.height} px</strong></div>` : ''}<div><span>Không gian</span><strong>${item.visibility === 'private' ? 'Riêng tư' : 'Thư viện chung'}</strong></div><div><span>Ngày tải lên</span><strong>${date(item.created_at)}</strong></div></div><div class="preview-actions"><button class="button secondary" id="preview-download">${icon('download')}Tải xuống</button><button class="button secondary" id="copy-url">${icon('link')}Sao chép URL</button>${type === 'image' && item.permissions.update ? `<button class="button primary" id="edit-image">${icon('spark')}Chỉnh sửa ảnh</button>` : ''}</div>${item.visibility === 'private' ? '<p class="editor-hint" style="margin-top:12px">URL riêng tư yêu cầu đăng nhập và quyền xem.</p>' : ''}</div></div>`, [{label: 'Đóng', run: () => $('modal').close()}], true);

    $('preview-download').onclick = () => download(item);
    $('copy-url').onclick = () => copyToClipboard(item.url, 'Đã sao chép đường dẫn tài nguyên.');
    if ($('edit-image')) $('edit-image').onclick = () => editor(item);
  }

  function editor(item) {
    modal('Chỉnh sửa hình ảnh', `<div class="editor-layout"><div><div class="editor-preview"><canvas id="editor-canvas"></canvas></div><p class="editor-hint" style="margin-top:10px">Lưu thành file mới. Ảnh gốc luôn được giữ lại nguyên vẹn.</p></div><div><div class="field-row"><label class="field"><span>Chiều rộng (px)</span><input id="image-width" type="number" min="1" max="8192" value="${item.width || 800}"></label><label class="field"><span>Chiều cao (px)</span><input id="image-height" type="number" min="1" max="8192" value="${item.height || 600}"></label></div><label class="check-field"><input type="checkbox" id="keep-ratio" checked>Giữ tỉ lệ ảnh gốc</label><label class="check-field"><input type="checkbox" id="enable-crop">Cắt ảnh theo vùng</label><div id="crop-fields" hidden><div class="field-row"><label class="field"><span>X</span><input id="crop-x" type="number" min="0" value="0"></label><label class="field"><span>Y</span><input id="crop-y" type="number" min="0" value="0"></label></div><div class="field-row"><label class="field"><span>Rộng</span><input id="crop-width" type="number" min="1" value="${item.width || 800}"></label><label class="field"><span>Cao</span><input id="crop-height" type="number" min="1" value="${item.height || 600}"></label></div></div><label class="field"><span>Định dạng đầu ra</span><select id="image-format"><option value="webp">WebP · Tối ưu cho website</option><option value="jpg">JPEG</option><option value="png">PNG · Giữ nền trong suốt</option></select></label><label class="check-field"><input type="checkbox" id="enable-watermark">Chèn watermark đóng dấu</label><div id="watermark-fields" hidden><label class="field"><span>Nội dung watermark</span><input id="watermark-text" value="${esc(config.brand?.watermark || '')}" maxlength="100"></label><label class="field"><span>Vị trí</span><select id="watermark-position"><option value="bottom-right">Dưới bên phải</option><option value="bottom-left">Dưới bên trái</option><option value="top-right">Trên bên phải</option><option value="top-left">Trên bên trái</option><option value="center">Chính giữa</option></select></label></div></div></div>`, [cancel, {
      label: 'Lưu bản mới',
      kind: 'primary',
      run: async () => {
        const options = {
          format: $('image-format').value,
          width: Number($('image-width').value),
          height: Number($('image-height').value)
        };
        if ($('enable-crop').checked) {
          options.crop = {
            x: Number($('crop-x').value),
            y: Number($('crop-y').value),
            width: Number($('crop-width').value),
            height: Number($('crop-height').value)
          };
        }
        if ($('enable-watermark').checked) {
          options.watermark = {
            text: $('watermark-text').value,
            position: $('watermark-position').value
          };
        }
        await mutate(`nodes/${item.id}/transform`, 'POST', options, 'Đã lưu ảnh mới và tạo thumbnail.');
        $('modal').close();
      }
    }], true);

    const source = new Image();
    source.crossOrigin = 'anonymous';
    source.src = item.url;

    function redraw() {
      if (!source.complete || !source.naturalWidth || !$('editor-canvas')) return;
      const crop = $('enable-crop').checked
        ? [Number($('crop-x').value), Number($('crop-y').value), Number($('crop-width').value), Number($('crop-height').value)]
        : [0, 0, source.naturalWidth, source.naturalHeight];
      const w = Number($('image-width').value), h = Number($('image-height').value);
      if (w < 1 || h < 1 || crop[2] < 1 || crop[3] < 1) return;
      const ratio = Math.min(1, 600 / w, 500 / h);
      const canvas = $('editor-canvas');
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, ...crop, 0, 0, canvas.width, canvas.height);

      if ($('enable-watermark').checked) {
        const text = $('watermark-text').value, pos = $('watermark-position').value;
        ctx.font = `${Math.max(10, canvas.width / 35)}px sans-serif`;
        const tw = ctx.measureText(text).width, th = Math.max(10, canvas.width / 35), pad = 15;
        let x = pos.includes('left') ? pad : canvas.width - tw - pad;
        let y = pos.includes('top') ? pad + th : canvas.height - pad;
        if (pos === 'center') {
          x = (canvas.width - tw) / 2;
          y = (canvas.height + th) / 2;
        }
        ctx.fillStyle = '#0007';
        ctx.fillText(text, x + 1, y + 1);
        ctx.fillStyle = '#ffffffdc';
        ctx.fillText(text, x, y);
      }
    }

    source.onload = redraw;
    source.onerror = () => toast('Không thể tải ảnh gốc để chỉnh sửa.', true);

    $('enable-crop').onchange = () => {
      $('crop-fields').hidden = !$('enable-crop').checked;
      redraw();
    };
    $('enable-watermark').onchange = () => {
      $('watermark-fields').hidden = !$('enable-watermark').checked;
      redraw();
    };

    for (const field of $('modal-body').querySelectorAll('input,select')) {
      field.addEventListener('input', () => {
        const ratio = $('enable-crop').checked
          ? Number($('crop-width').value) / Number($('crop-height').value)
          : (item.width && item.height ? item.width / item.height : 1);
        if ($('keep-ratio').checked && Number.isFinite(ratio) && ratio > 0) {
          if (field.id === 'image-width') $('image-height').value = Math.max(1, Math.round(Number(field.value) / ratio));
          if (field.id === 'image-height') $('image-width').value = Math.max(1, Math.round(Number(field.value) * ratio));
        }
        redraw();
      });
    }
  }

  async function grants(item) {
    try {
      const result = await api(`nodes/${item.id}/grants`);
      modal('Phân quyền tài nguyên', `<p class="modal-body-text">Quyền trên thư mục được kế thừa xuống các tài nguyên bên trong. Chủ sở hữu giữ toàn quyền quản lý.</p><div id="grant-list">${result.data.map((g) => `<div class="grant-row"><div><strong>Người dùng #${esc(g.user_id)}</strong><br><small>${['view','upload','update','delete'].filter((p) => g[p]).map((p) => ({view:'Xem',upload:'Tải lên',update:'Sửa',delete:'Xóa'}[p])).join(' · ') || 'Không có quyền'}</small></div><button class="text-button danger" data-revoke="${esc(g.user_id)}">Thu hồi</button></div>`).join('')}</div><label class="field" style="margin-top:20px"><span>ID người dùng</span><input id="grant-user" placeholder="Nhập ID người dùng cần cấp quyền" maxlength="191"></label><div class="grant-permissions">${[['view','Xem'],['upload','Tải lên'],['update','Sửa'],['delete','Xóa']].map(([p,label]) => `<label class="check-field"><input type="checkbox" id="grant-${p}" ${p === 'view' ? 'checked' : ''}>${label}</label>`).join('')}</div>`, [cancel, {
        label: 'Lưu quyền',
        kind: 'primary',
        run: async () => {
          const user_id = $('grant-user').value.trim();
          if (!user_id) throw new Error('Nhập ID người dùng cần cấp quyền.');
          const data = {user_id};
          for (const p of ['view','upload','update','delete']) data[p] = $(`grant-${p}`).checked;
          await api(`nodes/${item.id}/grants`, 'PUT', data);
          toast('Đã cập nhật quyền thành công.');
          await grants(item);
        }
      }]);

      $('grant-list').querySelectorAll('[data-revoke]').forEach((el) => {
        el.onclick = async () => {
          try {
            await api(`nodes/${item.id}/grants/${encodeURIComponent(el.dataset.revoke)}`, 'DELETE');
            toast('Đã thu hồi quyền.');
            await grants(item);
          } catch (e) {
            toast(e.message, true);
          }
        };
      });
    } catch (e) {
      toast(e.message, true);
    }
  }

  // ==========================================
  // Inspector Drawer Handler
  // ==========================================
  function openInspector() {
    state.inspectorOpen = true;
    try { localStorage.setItem('kbtech:media:inspector', '1'); } catch (_) {}
    $('inspector').hidden = false;
    $('toggle-inspector')?.classList.add('active');
    updateInspector();
  }

  function closeInspector() {
    state.inspectorOpen = false;
    try { localStorage.setItem('kbtech:media:inspector', '0'); } catch (_) {}
    $('inspector').hidden = true;
    $('toggle-inspector')?.classList.remove('active');
  }

  function toggleInspector() {
    if (state.inspectorOpen) closeInspector();
    else openInspector();
  }

  function updateInspector() {
    if (!state.inspectorOpen || config.picker) return;
    const item = state.activeItem || (state.selected.size === 1 ? [...state.selected.values()][0] : null);
    const container = $('inspector-content');

    if (!item) {
      container.innerHTML = '<div class="inspector-empty">Chọn một tài nguyên để xem thông tin chi tiết, kích thước và liên kết trực tiếp.</div>';
      return;
    }

    const type = typeOf(item);
    let previewHtml = '';
    if (item.kind === 'folder') {
      previewHtml = `<div class="inspector-media folder">${icon('folder', 'large-icon')}</div>`;
    } else if (type === 'image') {
      previewHtml = `<div class="inspector-media"><img src="${esc(item.thumbnail_url || item.url)}" alt="${esc(item.name)}"></div>`;
    } else if (type === 'audio') {
      previewHtml = `<div class="inspector-media audio">${icon('audio', 'large-icon')}<audio src="${esc(item.url)}" controls style="width:100%;margin-top:10px"></audio></div>`;
    } else if (type === 'video') {
      previewHtml = `<div class="inspector-media"><video src="${esc(item.url)}" controls playsinline style="width:100%;border-radius:6px"></video></div>`;
    } else {
      previewHtml = `<div class="inspector-media document">${icon(type === 'code' ? 'file' : 'file', 'large-icon')}</div>`;
    }

    container.innerHTML = `
      ${previewHtml}
      <div class="inspector-section">
        <div class="inspector-title" title="${esc(item.name)}">${esc(item.name)}</div>
        <div class="inspector-table">
          <div class="inspector-row"><span>Loại:</span><strong>${item.kind === 'folder' ? 'Thư mục' : esc(item.extension?.toUpperCase() || item.mime)}</strong></div>
          <div class="inspector-row"><span>Dung lượng:</span><strong>${item.kind === 'folder' ? '—' : bytes(item.size)}</strong></div>
          ${item.width ? `<div class="inspector-row"><span>Độ phân giải:</span><strong>${item.width} × ${item.height} px</strong></div>` : ''}
          <div class="inspector-row"><span>Không gian:</span><strong>${item.visibility === 'private' ? 'Riêng tư' : 'Chung'}</strong></div>
          <div class="inspector-row"><span>Cập nhật:</span><strong>${date(item.updated_at)}</strong></div>
          <div class="inspector-row"><span>Tạo lúc:</span><strong>${date(item.created_at)}</strong></div>
        </div>
      </div>
      ${item.kind === 'file' ? `
      <div class="inspector-section">
        <label class="inspector-label">Liên kết trực tiếp</label>
        <div class="inspector-url-row">
          <input class="inspector-url-input" type="text" readonly value="${esc(item.url)}" id="inspector-url">
          <button class="button secondary small" id="inspector-copy-btn">${icon('link')}Sao chép</button>
        </div>
      </div>
      <div class="inspector-actions">
        <button class="button secondary small" id="inspector-download-btn">${icon('download')}Tải về</button>
        ${item.permissions.update ? `<button class="button secondary small" id="inspector-duplicate-btn">${icon('copy')}Nhân bản</button>` : ''}
        ${item.permissions.update ? `<button class="button secondary small" id="inspector-rename-btn">${icon('edit')}Đổi tên</button>` : ''}
        ${item.permissions.delete ? `<button class="button danger-outline small" id="inspector-trash-btn">${icon('trash')}Xóa</button>` : ''}
      </div>` : ''}
    `;

    if ($('inspector-copy-btn')) {
      $('inspector-copy-btn').onclick = () => copyToClipboard(item.url, 'Đã sao chép liên kết tài nguyên.');
    }
    if ($('inspector-download-btn')) {
      $('inspector-download-btn').onclick = () => download(item);
    }
    if ($('inspector-duplicate-btn')) {
      $('inspector-duplicate-btn').onclick = () => duplicate(item);
    }
    if ($('inspector-rename-btn')) {
      $('inspector-rename-btn').onclick = () => rename(item);
    }
    if ($('inspector-trash-btn')) {
      $('inspector-trash-btn').onclick = () => trash([item]);
    }
  }

  // ==========================================
  // Keyboard Shortcuts Modal
  // ==========================================
  function showShortcutsModal() {
    modal('Phím tắt thao tác nhanh', `
      <p class="modal-body-text">Tối ưu hiệu năng và tốc độ thao tác của bạn với các phím tắt tích hợp:</p>
      <div class="shortcut-grid">
        <div class="shortcut-item"><span>Chọn tất cả file</span><kbd>Ctrl + A</kbd></div>
        <div class="shortcut-item"><span>Bỏ chọn tất cả</span><kbd>Esc</kbd></div>
        <div class="shortcut-item"><span>Xem trước tài nguyên</span><kbd>Space / Cách</kbd></div>
        <div class="shortcut-item"><span>Mở tài nguyên</span><kbd>Enter</kbd></div>
        <div class="shortcut-item"><span>Đổi tên file/thư mục</span><kbd>F2</kbd></div>
        <div class="shortcut-item"><span>Chuyển vào thùng rác</span><kbd>Delete / Backspace</kbd></div>
        <div class="shortcut-item"><span>Bật/Tắt bảng chi tiết</span><kbd>I</kbd></div>
        <div class="shortcut-item"><span>Tìm kiếm tài nguyên</span><kbd>/</kbd></div>
        <div class="shortcut-item"><span>Dán ảnh chụp màn hình</span><kbd>Ctrl + V</kbd></div>
        <div class="shortcut-item"><span>Bảng phím tắt này</span><kbd>?</kbd></div>
      </div>
    `, [{label: 'Đã hiểu', kind: 'primary', run: () => $('modal').close()}]);
  }

  // ==========================================
  // Upload Processing
  // ==========================================
  let runningUploads = 0;
  async function uploadFiles(files) {
    if (!state.canUpload) {
      toast('Bạn không có quyền tải lên thư mục này.', true);
      return;
    }
    if (!files || !files.length) return;
    if (runningUploads) {
      toast('Đợi lượt tải lên hiện tại hoàn tất.', true);
      return;
    }
    if (files.length > config.upload.maxFiles) {
      toast(`Mỗi lượt tối đa ${config.upload.maxFiles} file.`, true);
      return;
    }

    const parent = state.parent;
    const visibility = state.tree.find((x) => x.id === parent)?.visibility || (state.scope === 'private' ? 'private' : 'shared');
    const queue = [...files].map((file, i) => ({file, id: i, progress: 0, status: 'waiting', error: ''}));

    runningUploads = queue.length;
    $('uploads').hidden = false;
    renderQueue(queue);

    let index = 0, done = 0;
    async function worker() {
      while (index < queue.length) {
        const entry = queue[index++];
        entry.status = 'uploading';
        try {
          const ext = entry.file.name.split('.').at(-1).toLowerCase();
          if (!config.upload.extensions.includes(ext)) throw new Error(`Định dạng .${ext} không được hỗ trợ.`);
          if (entry.file.size > config.upload.maxKb * 1024) throw new Error(`File vượt quá dung lượng tối đa (${bytes(config.upload.maxKb * 1024)}).`);

          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const data = new FormData();
            data.append('files[]', entry.file);
            data.append('visibility', visibility);
            if (parent) data.append('parent_id', parent);

            xhr.open('POST', `${config.base}/api/upload`);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('X-CSRF-TOKEN', config.csrf);
            xhr.timeout = 180000;

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                entry.progress = Math.round(event.loaded / event.total * 100);
                renderQueue(queue);
              }
            };
            xhr.onload = () => {
              let result;
              try { result = JSON.parse(xhr.responseText); } catch (_) { result = {}; }
              if (xhr.status >= 200 && xhr.status < 300) resolve(result);
              else reject(new Error(xhr.status === 419 ? 'Phiên làm việc hết hạn. Hãy tải lại trang.' : Object.values(result.errors || {}).flat()[0] || result.message || 'Tải lên thất bại.'));
            };
            xhr.onerror = () => reject(new Error('Mất kết nối mạng. Hãy thử lại.'));
            xhr.ontimeout = () => reject(new Error('Tải lên quá thời gian chờ (timeout).'));
            xhr.send(data);
          });

          entry.progress = 100;
          entry.status = 'done';
          done++;
        } catch (error) {
          entry.status = 'error';
          entry.error = error.message;
        } finally {
          runningUploads--;
          renderQueue(queue);
        }
      }
    }

    await Promise.all(Array.from({length: Math.min(3, queue.length)}, worker));
    toast(`Đã tải lên ${done}/${queue.length} file.`, done !== queue.length);
    await load(true);
    $('file-input').value = '';
  }

  function renderQueue(queue) {
    $('queue-title').textContent = runningUploads
      ? `Đang tải lên · ${queue.filter((x) => x.status === 'done').length}/${queue.length}`
      : 'Đã hoàn tất lượt tải lên';
    $('queue-items').innerHTML = queue.map((x) => `
      <div class="queue-item ${x.status === 'error' ? 'error' : ''}">
        <div class="queue-name">
          <span>${esc(x.file.name)}</span>
          <span>${x.status === 'done' ? '✓ Hoàn tất' : x.status === 'error' ? 'Thất bại' : x.status === 'waiting' ? 'Đang chờ' : x.progress >= 100 ? 'Đang xử lý…' : `${x.progress}%`}</span>
        </div>
        <div class="queue-progress"><span style="width:${x.progress}%"></span></div>
        ${x.error ? `<div class="queue-error">${esc(x.error)}</div>` : ''}
      </div>
    `).join('');
    $('close-queue').disabled = !!runningUploads;
  }

  // ==========================================
  // Clipboard Paste Upload (Screenshots)
  // ==========================================
  window.addEventListener('paste', async (event) => {
    if ($('modal').open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    if (!state.canUpload || state.scope === 'trash') return;

    const items = event.clipboardData?.items;
    if (!items) return;

    const filesToUpload = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const ext = blob.type.split('/')[1] || 'png';
          const fileName = `screenshot_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}.${ext}`;
          filesToUpload.push(new File([blob], fileName, {type: blob.type}));
        }
      }
    }

    if (filesToUpload.length > 0) {
      toast(`Đang tải lên ${filesToUpload.length} ảnh từ bộ nhớ tạm...`);
      await uploadFiles(filesToUpload);
    }
  });

  // ==========================================
  // Global Event Listeners & Bindings
  // ==========================================
  $('close-queue').onclick = () => $('uploads').hidden = true;
  $('upload-button').onclick = () => $('file-input').click();
  $('dropzone').onclick = () => $('file-input').click();
  $('dropzone').onkeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      $('file-input').click();
    }
  };
  $('file-input').onchange = () => uploadFiles($('file-input').files);

  for (const type of ['dragenter', 'dragover']) {
    $('dropzone').addEventListener(type, (event) => {
      event.preventDefault();
      $('dropzone').classList.add('drag-over');
    });
  }
  $('dropzone').addEventListener('dragleave', (event) => {
    if (!$('dropzone').contains(event.relatedTarget)) $('dropzone').classList.remove('drag-over');
  });
  $('dropzone').addEventListener('drop', (event) => {
    event.preventDefault();
    $('dropzone').classList.remove('drag-over');
    uploadFiles(event.dataTransfer.files);
  });
  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => event.preventDefault());

  $('new-folder').onclick = folder;
  $('sidebar-new-folder').onclick = folder;

  document.querySelectorAll('[data-scope]').forEach((el) => {
    el.onclick = () => nav(el.dataset.scope);
  });

  document.querySelectorAll('[data-type]').forEach((el) => {
    el.onclick = () => {
      state.type = el.dataset.type;
      state.page = 1;
      clearSelection();
      load();
    };
  });

  $('sort').onchange = () => {
    state.sort = $('sort').value;
    state.page = 1;
    load();
  };

  $('search').oninput = () => {
    const val = $('search').value.trim();
    $('search-clear').hidden = !val;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = val;
      state.page = 1;
      clearSelection();
      load();
    }, 300);
  };

  $('search-clear').onclick = () => {
    $('search').value = '';
    $('search-clear').hidden = true;
    state.q = '';
    state.page = 1;
    clearSelection();
    load();
    $('search').focus();
  };

  for (const view of ['grid', 'list']) {
    $(`${view}-view`).onclick = () => {
      state.view = view;
      try { localStorage.setItem('kbtech:media:view', view); } catch (_) {}
      load();
    };
  }

  // Inspector toggle
  if ($('toggle-inspector')) $('toggle-inspector').onclick = toggleInspector;
  if ($('close-inspector')) $('close-inspector').onclick = closeInspector;

  // Shortcuts modal
  if ($('toggle-shortcuts')) $('toggle-shortcuts').onclick = showShortcutsModal;

  // Batch actions
  $('select-all').onchange = () => {
    const checked = $('select-all').checked;
    state.items.filter((x) => x.kind === 'file' && !x.deleted_at).forEach((x) => select(x, checked));
  };
  $('clear-selection').onclick = clearSelection;
  if ($('clear-selection-trash')) $('clear-selection-trash').onclick = clearSelection;

  $('batch-download').onclick = () => batchDownload([...state.selected.values()]);
  $('batch-copy-url').onclick = () => {
    const urls = [...state.selected.values()].map((x) => x.url).join('\n');
    copyToClipboard(urls, `Đã sao chép ${state.selected.size} liên kết tài nguyên.`);
  };
  $('batch-move').onclick = () => move([...state.selected.values()]);
  $('batch-trash').onclick = () => trash([...state.selected.values()]);

  // Trash batch actions
  if ($('batch-restore')) {
    $('batch-restore').onclick = async () => {
      const items = [...state.selected.values()];
      if (!items.length) return;
      try {
        const ids = items.map((x) => x.id);
        const res = await api('batch/restore', 'POST', {ids});
        clearSelection();
        toast(`Đã khôi phục ${res.restored_count ?? ids.length} tài nguyên.`);
        await load(true);
      } catch (e) {
        toast(e.message, true);
      }
    };
  }

  if ($('batch-purge')) {
    $('batch-purge').onclick = () => {
      const items = [...state.selected.values()];
      if (!items.length) return;
      confirmAction('Xóa vĩnh viễn các tài nguyên đã chọn?', `${items.length} tài nguyên sẽ bị xóa hoàn toàn khỏi hệ thống lưu trữ và cơ sở dữ liệu. Thao tác này không thể hoàn tác.`, async () => {
        const ids = items.map((x) => x.id);
        const res = await api('batch/purge', 'DELETE', {ids});
        clearSelection();
        toast(`Đã xóa vĩnh viễn ${res.purged_count ?? ids.length} tài nguyên.`);
        await load(true);
      }, true);
    };
  }

  // Empty trash button
  if ($('empty-trash-btn')) {
    $('empty-trash-btn').onclick = () => {
      confirmAction('Dọn sạch toàn bộ thùng rác?', 'Tất cả tài nguyên trong thùng rác sẽ bị xóa vĩnh viễn khỏi máy chủ và cơ sở dữ liệu. Thao tác này hoàn toàn không thể khôi phục!', async () => {
        const res = await api('trash/empty', 'DELETE');
        clearSelection();
        toast(`Đã dọn sạch thùng rác (${res.purged_count ?? 0} tài nguyên đã xóa).`);
        await load(true);
      }, true);
    };
  }

  // Modal event listeners
  $('close-modal').onclick = () => $('modal').close();
  $('modal').addEventListener('click', (event) => {
    if (event.target === $('modal')) {
      const r = $('modal').getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) {
        $('modal').close();
      }
    }
  });
  $('modal').addEventListener('close', () => {
    $('modal-body').querySelectorAll('video,audio').forEach((m) => m.pause());
  });

  // Mobile sidebar
  const mobileQuery = matchMedia('(max-width:768px)');
  function syncSidebar() {
    $('sidebar').inert = mobileQuery.matches && !$('sidebar').classList.contains('open');
    $('menu-toggle').setAttribute('aria-expanded', String($('sidebar').classList.contains('open')));
  }
  mobileQuery.addEventListener('change', syncSidebar);
  $('menu-toggle').onclick = () => {
    $('sidebar').classList.toggle('open');
    $('sidebar-shade').classList.toggle('open');
    syncSidebar();
  };
  $('sidebar-shade').onclick = () => {
    $('sidebar').classList.remove('open');
    $('sidebar-shade').classList.remove('open');
    syncSidebar();
  };
  syncSidebar();

  // Keyboard shortcut listener
  document.addEventListener('keydown', (event) => {
    const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);

    if (event.key === '/' && !$('modal').open && !inInput) {
      event.preventDefault();
      $('search').focus();
      return;
    }

    if (event.key === '?' && !$('modal').open && !inInput) {
      event.preventDefault();
      showShortcutsModal();
      return;
    }

    if ((event.key === 'i' || event.key === 'I') && !$('modal').open && !inInput) {
      event.preventDefault();
      toggleInspector();
      return;
    }

    // Ctrl+A / Cmd+A select all files
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && !inInput && !$('modal').open) {
      event.preventDefault();
      const files = state.items.filter((x) => x.kind === 'file' && !x.deleted_at);
      files.forEach((f) => state.selected.set(f.id, f));
      renderSelection();
      if (state.inspectorOpen) updateInspector();
      return;
    }

    // Delete / Backspace key
    if ((event.key === 'Delete' || event.key === 'Backspace') && !inInput && !$('modal').open && state.selected.size > 0) {
      event.preventDefault();
      if (state.scope === 'trash') {
        $('batch-purge')?.click();
      } else {
        trash([...state.selected.values()]);
      }
      return;
    }

    // Space key: quick preview selected file
    if (event.key === ' ' && !inInput && !$('modal').open && state.selected.size === 1) {
      event.preventDefault();
      preview([...state.selected.values()][0]);
      return;
    }

    // F2 key: rename selected file
    if (event.key === 'F2' && !inInput && !$('modal').open) {
      const target = state.activeItem || (state.selected.size === 1 ? [...state.selected.values()][0] : null);
      if (target && target.permissions?.update) {
        event.preventDefault();
        rename(target);
      }
      return;
    }

    // Escape key
    if (event.key === 'Escape' && !$('modal').open) {
      if (state.selected.size) {
        clearSelection();
      }
    }
  });

  // Picker confirmation
  $('confirm-picker').onclick = () => {
    const files = [...state.selected.values()].map(({id, name, url, mime, size, width, height, visibility}) => ({
      id, name, url, mime, size, width, height, visibility
    }));
    if (!files.length) return;
    const target = window.opener || (window.parent !== window ? window.parent : null);
    if (!target) {
      toast('Hãy mở thư viện từ bộ chọn file của ứng dụng.', true);
      return;
    }
    target.postMessage({type: 'kbtech:file-selected', channel: config.channel, files}, location.origin);
    if (window.opener) window.close();
  };

  // Initial load
  if (state.inspectorOpen) openInspector();
  load(true);
})();
