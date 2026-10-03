(() => {
  'use strict';
  const settingsEl = document.getElementById('fm-settings');
  if (!settingsEl) return;
  const config = JSON.parse(settingsEl.textContent);
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const bytes = (n) => { if (!n) return '0 KB'; const i = Math.min(3, Math.floor(Math.log(n) / Math.log(1024))); return `${(n / 1024 ** i).toLocaleString('vi-VN', {maximumFractionDigits:i < 2 ? 0 : 1})} ${['B','KB','MB','GB'][i]}`; };
  const date = (s) => new Date(s).toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric'});
  let savedView = 'grid';
  try { savedView = localStorage.getItem('kbtech:media:view') || 'grid'; } catch (_) {}
  const state = {scope:'all',parent:null,type:config.pickerType || '',q:'',sort:'newest',page:1,view:savedView,items:[],tree:[],selected:new Map(),loading:false,canUpload:config.canUpload};
  let requestId = 0, searchTimer, activeRequest;
  if (/^#[0-9a-f]{6}$/i.test(config.brand.color)) {
    document.documentElement.style.setProperty('--brand', config.brand.color);
    document.documentElement.style.setProperty('--brand-soft', `${config.brand.color}18`);
  }
  $('upload-limit').textContent = `Tối đa ${bytes(config.upload.maxKb * 1024)} / file`;
  $('file-input').accept = config.upload.extensions.map((x) => `.${x}`).join(',');
  if (config.picker) { document.body.classList.add('picker-mode'); $('picker-footer').hidden = false; }
  if (config.pickerType) document.querySelectorAll('[data-type]').forEach((el) => { el.hidden = el.dataset.type !== config.pickerType; });

  function toast(message, error = false) {
    const el = document.createElement('div'); el.className = `toast${error ? ' error' : ''}`; el.textContent = message;
    $('toast-region').append(el); setTimeout(() => el.remove(), 5500);
  }
  async function api(path, method = 'GET', data, signal) {
    const response = await fetch(`${config.base}/api/${path}`, {method,signal,credentials:'same-origin',headers:{'Accept':'application/json','X-CSRF-TOKEN':config.csrf,...(data !== undefined ? {'Content-Type':'application/json'} : {})},...(data !== undefined ? {body:JSON.stringify(data)} : {})});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = response.status === 419 ? 'Phiên làm việc đã hết hạn. Hãy tải lại trang.' : response.status === 401 ? 'Vui lòng đăng nhập lại.' : Object.values(result.errors || {}).flat()[0] || result.message || `Không thể thực hiện thao tác (${response.status}).`;
      throw new Error(message);
    }
    return result;
  }
  function clearSelection() { state.selected.clear(); renderSelection(); }
  function nav(scope, parent = null) {
    state.scope = scope; state.parent = parent; state.page = 1; state.q = ''; $('search').value = ''; clearSelection();
    $('sidebar').classList.remove('open'); $('sidebar-shade').classList.remove('open'); load();
    syncSidebar();
  }
  function typeOf(item) { return item.kind === 'folder' ? 'folder' : item.mime?.startsWith('image/') ? 'image' : item.mime?.startsWith('video/') ? 'video' : item.extension === 'zip' ? 'archive' : 'document'; }
  function select(item, checked) {
    if (item.kind === 'folder' || item.deleted_at) return;
    if (checked && config.picker && !config.multiple) state.selected.clear();
    if (checked) state.selected.set(item.id, item); else state.selected.delete(item.id);
    renderSelection();
  }
  function renderSelection() {
    const count = state.selected.size;
    $('selected-count').textContent = `${count} file đã chọn`;
    $('selection-bar').hidden = !count || config.picker;
    $('content').classList.toggle('selection-mode', !!count);
    document.querySelectorAll('[data-card]').forEach((el) => { const checked = state.selected.has(Number(el.dataset.card)); el.classList.toggle('selected', checked); const cb = el.querySelector('.card-checkbox'); if (cb) cb.checked = checked; });
    const selectable = state.items.filter((x) => x.kind === 'file' && !x.deleted_at);
    $('select-all').checked = selectable.length > 0 && selectable.every((x) => state.selected.has(x.id));
    $('batch-move').disabled = [...state.selected.values()].some((x) => !x.permissions.update);
    $('batch-trash').disabled = [...state.selected.values()].some((x) => !x.permissions.delete);
    $('picker-count').textContent = count ? `${count} file đã chọn` : 'Chưa chọn file nào';
    $('confirm-picker').disabled = !count;
  }
  async function load(refreshTree = false) {
    const id = ++requestId; activeRequest?.abort(); activeRequest = new AbortController();
    state.loading = true; $('content').setAttribute('aria-busy', 'true');
    $('content').innerHTML = Array.from({length:8}, () => '<div class="skeleton"></div>').join('');
    const query = new URLSearchParams({scope:state.scope,sort:state.sort,page:state.page,per_page:40});
    if (state.parent) query.set('parent_id',state.parent);
    if (state.type) query.set('type',state.type);
    if (state.q) query.set('q',state.q);
    try {
      const result = await api(`nodes?${query}`, 'GET', undefined, activeRequest.signal);
      if (id !== requestId) return;
      state.items = result.data; state.canUpload = result.can_upload;
      renderItems(result); renderNavigation(result); renderPagination(result.meta);
      if (refreshTree || !state.tree.length) await loadTree();
    } catch (error) {
      if (error.name === 'AbortError' || id !== requestId) return;
      $('content').innerHTML = `<div class="empty-state">${icon('folder')}<h3>Chưa thể tải thư viện</h3><p>${esc(error.message)}</p><button class="button secondary" id="retry-load">Thử lại</button></div>`;
      $('retry-load').onclick = () => load(); $('result-summary').textContent = 'Không thể tải dữ liệu';
    } finally { if (id === requestId) { state.loading = false; $('content').setAttribute('aria-busy','false'); } }
  }
  async function loadTree() {
    try { state.tree = (await api('tree')).data; renderTree(); } catch (error) { toast(error.message,true); }
  }
  function renderTree() {
    const depth = (item) => { let d = 0, parent = item.parent_id; const seen = new Set(); while (parent && !seen.has(parent)) { seen.add(parent); d++; parent = state.tree.find((n) => n.id === parent)?.parent_id; } return Math.min(d, 5); };
    const ordered = [];
    const append = (parent) => { state.tree.filter((x) => x.parent_id === parent).forEach((x) => { if (ordered.some((n) => n.id === x.id)) return; ordered.push(x); append(x.id); }); };
    append(null); state.tree.forEach((x) => { if (!ordered.includes(x)) ordered.push(x); });
    $('folder-tree').innerHTML = ordered.length ? ordered.map((x) => `<button class="tree-item${state.parent === x.id ? ' active' : ''}" data-folder="${x.id}" style="padding-left:${13 + depth(x) * 12}px">${icon('folder')}<span>${esc(x.name)}</span></button>`).join('') : '<div class="tree-empty">Tạo thư mục đầu tiên của bạn</div>';
    $('folder-tree').querySelectorAll('[data-folder]').forEach((el) => el.onclick = () => nav('all', Number(el.dataset.folder)));
  }
  function renderNavigation(result) {
    const titles = {all:'Thư viện tài nguyên',shared:'Thư viện chung',private:'Thư viện riêng',recent:'Tài nguyên gần đây',trash:'Thùng rác'};
    const parent = result.breadcrumbs.at(-1);
    $('page-title').innerHTML = `${esc(parent?.name || titles[state.scope])}<span class="title-dot">.</span>`;
    $('page-description').textContent = state.scope === 'trash' ? 'Khôi phục tài nguyên đã xóa hoặc dọn dẹp thư viện của bạn.' : state.scope === 'private' ? 'Không gian riêng cho tài nguyên của bạn và người được cấp quyền.' : 'Sắp xếp gọn gàng. Tìm kiếm dễ dàng. Sáng tạo không giới hạn.';
    document.querySelectorAll('[data-scope]').forEach((el) => el.classList.toggle('active', el.dataset.scope === state.scope && !state.parent));
    $('all-count').textContent = result.stats.files; $('trash-count').textContent = result.stats.trash;
    $('storage-used').textContent = bytes(result.stats.bytes);
    $('storage-limit').textContent = config.quota ? ` / ${bytes(config.quota)}` : ' / Không giới hạn';
    $('storage-bar').style.width = `${config.quota ? Math.min(100, result.stats.bytes / config.quota * 100) : 0}%`;
    $('total-count').textContent = result.meta.total;
    $('upload-button').disabled = !state.canUpload;
    $('new-folder').disabled = !state.canUpload;
    $('sidebar-new-folder').disabled = !state.canUpload;
    $('dropzone').hidden = !state.canUpload || state.scope === 'trash';
    $('breadcrumbs').innerHTML = `<button data-crumb="">${esc(titles[state.scope])}</button>` + result.breadcrumbs.map((x) => `${icon('chevron')}<button data-crumb="${x.id}">${esc(x.name)}</button>`).join('') + (state.q ? `${icon('chevron')}<span>Kết quả tìm kiếm</span>` : '');
    $('breadcrumbs').querySelectorAll('[data-crumb]').forEach((el) => el.onclick = () => nav(state.scope, Number(el.dataset.crumb) || null));
    document.querySelectorAll('[data-type]').forEach((el) => { const active = el.dataset.type === state.type; el.classList.toggle('active',active); el.setAttribute('aria-selected',String(active)); });
    renderTree();
  }
  function renderItems(result) {
    const content = $('content'); content.classList.toggle('list-mode',state.view === 'list');
    $('list-heading').hidden = state.view !== 'list';
    $('grid-view').classList.toggle('active',state.view !== 'list'); $('grid-view').setAttribute('aria-pressed',String(state.view !== 'list'));
    $('list-view').classList.toggle('active',state.view === 'list'); $('list-view').setAttribute('aria-pressed',String(state.view === 'list'));
    if (!state.items.length) {
      content.innerHTML = `<div class="empty-state">${icon(state.scope === 'trash' ? 'trash' : 'folder')}<h3>${state.q ? 'Không tìm thấy tài nguyên' : state.scope === 'trash' ? 'Thùng rác đang trống' : 'Không gian cho ý tưởng mới'}</h3><p>${state.q ? 'Thử một từ khóa khác hoặc thay đổi bộ lọc.' : state.scope === 'trash' ? 'Các tài nguyên đã xóa sẽ xuất hiện ở đây để bạn có thể khôi phục.' : 'Tải lên file hoặc tạo thư mục để bắt đầu sắp xếp tài nguyên của bạn.'}</p>${state.canUpload ? '<button class="button primary" id="empty-upload">Tải lên file đầu tiên</button>' : ''}</div>`;
      if ($('empty-upload')) $('empty-upload').onclick = () => $('file-input').click();
    } else {
      const cards = state.items.map((item) => {
        const folder = item.kind === 'folder', type = typeOf(item);
        const preview = folder ? `<div class="folder-tile">${icon('folder')}</div>` : `<div class="file-preview ${type}">${item.thumbnail_url ? `<img src="${esc(item.thumbnail_url)}" alt="${esc(item.name)}" loading="lazy">` : icon(type === 'archive' ? 'folder' : type === 'document' ? 'file' : type, 'large-icon')}<span class="extension-badge">${esc(item.extension)}</span></div>`;
        const meta = state.view === 'list' ? `<span class="list-type">${folder ? 'Thư mục' : esc(item.extension?.toUpperCase())}</span><span class="list-size">${folder ? '—' : bytes(item.size)}</span><span class="list-date">${date(item.updated_at)}</span>` : `<div class="file-meta"><span>${folder ? 'Thư mục' : bytes(item.size)}</span><span class="private-indicator">${icon(item.visibility === 'private' ? 'lock' : 'users')}${item.visibility === 'private' ? 'Riêng tư' : 'Chung'}</span></div>`;
        return `<article class="file-card${folder ? ' folder-card' : ''}" data-card="${item.id}" tabindex="0" aria-label="${esc(item.name)}">${!folder && !item.deleted_at ? `<input class="card-checkbox" type="checkbox" aria-label="Chọn ${esc(item.name)}">` : ''}${preview}<div class="file-card-info"><div class="file-name-row"><span class="file-name" title="${esc(item.name)}">${esc(item.name)}</span><button class="card-menu icon-button" aria-label="Thao tác với ${esc(item.name)}">${icon('more')}</button></div>${meta}</div></article>`;
      });
      const folders = cards.filter((_, i) => state.items[i].kind === 'folder').join('');
      const files = cards.filter((_, i) => state.items[i].kind !== 'folder').join('');
      content.innerHTML = (folders ? `<div class="folder-group">${folders}</div>` : '') + files;
      content.querySelectorAll('[data-card]').forEach((card) => {
        const item = state.items.find((x) => x.id === Number(card.dataset.card));
        const activate = () => { if (item.deleted_at) contextMenu(item,card.querySelector('.card-menu')); else if (item.kind === 'folder') nav('all',item.id); else if (config.picker) select(item,!state.selected.has(item.id)); else preview(item); };
        card.onclick = (event) => { if (!event.target.closest('button,input')) activate(); };
        card.onkeydown = (event) => { if (event.target !== card) return; if (event.key === 'Enter') {event.preventDefault();activate();} if (event.key === ' ' && item.kind === 'file') {event.preventDefault();select(item,!state.selected.has(item.id));} };
        const check = card.querySelector('.card-checkbox'); if (check) check.onchange = () => select(item,check.checked);
        card.querySelector('.card-menu').onclick = (event) => {event.stopPropagation();contextMenu(item,event.currentTarget);};
        card.querySelector('img')?.addEventListener('error', (event) => { event.target.replaceWith(document.createTextNode('Không thể tải ảnh')); });
      });
    }
    renderSelection();
    const total = result.meta.total, start = total ? (state.page - 1) * result.meta.per_page + 1 : 0;
    $('result-summary').textContent = total ? `Hiển thị ${start}–${Math.min(start + state.items.length - 1,total)} trong ${total} tài nguyên` : 'Chưa có tài nguyên';
  }
  function renderPagination(meta) {
    $('pagination').innerHTML = meta.last_page > 1 ? `<div class="pagination"><button class="page-button" data-page="${meta.page - 1}" ${meta.page <= 1 ? 'disabled' : ''}>←</button><span class="page-button active">${meta.page} / ${meta.last_page}</span><button class="page-button" data-page="${meta.page + 1}" ${meta.page >= meta.last_page ? 'disabled' : ''}>→</button></div>` : '';
    $('pagination').querySelectorAll('[data-page]').forEach((el) => el.onclick = () => {state.page = Number(el.dataset.page);load();});
  }
  let menu;
  function closeMenu() { menu?.remove(); menu = null; }
  function contextMenu(item, anchor) {
    closeMenu(); menu = document.createElement('div'); menu.className = 'context-menu'; menu.setAttribute('role','menu');
    const actions = [];
    if (item.deleted_at) {
      if (item.permissions.delete) { actions.push(['restore','Khôi phục',() => mutate(`nodes/${item.id}/restore`,'POST',undefined,'Đã khôi phục tài nguyên.')]); actions.push(['trash','Xóa vĩnh viễn',() => confirmAction('Xóa vĩnh viễn?', `“${item.name}” sẽ bị xóa vĩnh viễn cùng mọi tài nguyên bên trong. Bạn không thể khôi phục thao tác này.`, () => mutate(`nodes/${item.id}/purge`,'DELETE',undefined,'Đã xóa vĩnh viễn.'),true)]); }
    } else {
      if (item.kind === 'file') { actions.push(['image','Xem trước',() => preview(item)]); actions.push(['download','Tải xuống',() => download(item)]); }
      if (item.permissions.update) {actions.push(['edit','Đổi tên',() => rename(item)]);actions.push(['move','Di chuyển',() => move([item])]);if (typeOf(item) === 'image') actions.push(['spark','Chỉnh sửa ảnh',() => editor(item)]);}
      if (item.permissions.share) actions.push(['users','Phân quyền',() => grants(item)]);
      if (item.permissions.delete) actions.push(['trash','Chuyển vào thùng rác',() => trash([item])]);
    }
    if (!actions.length) actions.push(['lock','Bạn chỉ có quyền xem',() => {}]);
    menu.innerHTML = actions.map(([name,label],i) => `<button role="menuitem" data-action="${i}" class="${name === 'trash' ? 'danger' : ''}">${icon(name)}${esc(label)}</button>`).join('');
    document.body.append(menu); const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.max(8,Math.min(rect.right - menu.offsetWidth,innerWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${Math.max(8,Math.min(rect.bottom + 5,innerHeight - menu.offsetHeight - 8))}px`;
    menu.querySelectorAll('[data-action]').forEach((el) => el.onclick = () => {const action = actions[Number(el.dataset.action)][2];closeMenu();action();});
    menu.querySelector('button')?.focus();
  }
  document.addEventListener('click',(event) => { if (menu && !menu.contains(event.target) && !event.target.closest('.card-menu')) closeMenu(); });
  document.addEventListener('keydown',(event) => {if (event.key === 'Escape') closeMenu();});
  function modal(title, body, actions = [], wide = false) {
    if ($('modal').open) $('modal').close();
    $('modal-title').textContent = title; $('modal-body').innerHTML = body; $('modal-actions').innerHTML = '';
    $('modal').classList.toggle('wide',wide);
    for (const action of actions) {
      const btn = document.createElement('button'); btn.className = `button ${action.kind || 'secondary'}`; btn.textContent = action.label;
      btn.onclick = async () => {
        $('modal-body').querySelector('.form-error')?.remove(); btn.disabled = true;
        try { await action.run(); } catch (error) {const el = document.createElement('div');el.className = 'form-error';el.setAttribute('role','alert');el.textContent = error.message;$('modal-body').append(el);} finally {btn.disabled = false;}
      };
      $('modal-actions').append(btn);
    }
    $('modal').showModal();
  }
  const cancel = {label:'Hủy',run:() => $('modal').close()};
  function confirmAction(title, message, run, permanent = false) {
    modal(title,`<p class="modal-body-text">${esc(message)}</p>`,[cancel,{label:permanent ? 'Xóa vĩnh viễn' : 'Xác nhận',kind:permanent ? 'danger-button' : 'primary',run:async () => {await run();$('modal').close();}}]);
  }
  async function mutate(path, method, data, message) { await api(path,method,data);clearSelection();toast(message);await load(true); }
  function folder() {
    const parent = state.tree.find((x) => x.id === state.parent);
    modal('Tạo thư mục mới',`<label class="field"><span>Tên thư mục</span><input id="folder-name" maxlength="255" placeholder="Ví dụ: Hình ảnh sản phẩm" autofocus></label>${parent ? `<p class="modal-body-text">Tạo bên trong “${esc(parent.name)}”. Kế thừa chế độ ${parent.visibility === 'shared' ? 'chung' : 'riêng tư'}.</p>` : `<label class="field"><span>Không gian lưu trữ</span><select id="folder-visibility"><option value="shared" ${state.scope !== 'private' ? 'selected' : ''}>Thư viện chung</option><option value="private" ${state.scope === 'private' ? 'selected' : ''}>Thư viện riêng</option></select></label>`}`,[cancel,{label:'Tạo thư mục',kind:'primary',run:async () => { const name = $('folder-name').value.trim();if (!name) throw new Error('Vui lòng nhập tên thư mục.');await mutate('folders','POST',{name,parent_id:state.parent,visibility:parent?.visibility || $('folder-visibility').value},'Đã tạo thư mục.');$('modal').close(); }}]);
    $('folder-name').focus();
  }
  function rename(item) {
    modal('Đổi tên tài nguyên',`<label class="field"><span>Tên mới</span><input id="rename-name" maxlength="255" value="${esc(item.name)}"></label>${item.kind === 'file' ? '<p class="modal-body-text">Giữ nguyên phần mở rộng của file.</p>' : ''}`,[cancel,{label:'Lưu thay đổi',kind:'primary',run:async () => {const name = $('rename-name').value.trim();if (!name) throw new Error('Vui lòng nhập tên.');await mutate(`nodes/${item.id}`,'PATCH',{name},'Đã đổi tên tài nguyên.');$('modal').close();}}]);
    $('rename-name').focus(); $('rename-name').setSelectionRange(0,item.kind === 'file' ? item.name.lastIndexOf('.') : item.name.length);
  }
  function isDescendant(folder, ids) { const seen = new Set();let current = folder;while (current && !seen.has(current.id)) { if (ids.includes(current.id)) return true;seen.add(current.id);current = state.tree.find((x) => x.id === current.parent_id); }return false; }
  function folderPath(item) {let path = item.name,parent = item.parent_id;const seen = new Set([item.id]);while (parent && !seen.has(parent)) {seen.add(parent);const node = state.tree.find((x) => x.id === parent);if (!node) break;path = `${node.name} / ${path}`;parent = node.parent_id;}return path;}
  async function move(items) {
    if (!items.length) return;
    if (items.some((x) => x.visibility !== items[0].visibility)) {toast('Hãy chọn các tài nguyên cùng không gian chung hoặc riêng.',true);return;}
    await loadTree(); const ids = items.map((x) => x.id);
    const folders = state.tree.filter((x) => x.permissions.upload && x.visibility === items[0].visibility && !isDescendant(x,ids));
    modal('Di chuyển tài nguyên',`<p class="modal-body-text">Chọn thư mục đích cho ${items.length} tài nguyên. Chế độ chung/riêng được giữ nguyên.</p><label class="field" style="margin-top:18px"><span>Thư mục đích</span><select id="move-target"><option value="">Thư mục gốc</option>${folders.map((x) => `<option value="${x.id}">${esc(folderPath(x))}</option>`).join('')}</select></label>`,[cancel,{label:'Di chuyển',kind:'primary',run:async () => {
      let done = 0;
      try {for (const item of items) {await api(`nodes/${item.id}`,'PATCH',{parent_id:Number($('move-target').value) || null});done++;}} catch (e) {await load(true);throw new Error(`${done} tài nguyên đã chuyển. ${e.message}`);}
      clearSelection();await load(true);toast(`Đã di chuyển ${done} tài nguyên.`);$('modal').close();
    }}]);
  }
  function trash(items) {
    if (!items.length) return;
    confirmAction('Chuyển vào thùng rác?',items.length === 1 ? `“${items[0].name}” sẽ được chuyển vào thùng rác. Bạn có thể khôi phục sau.` : `${items.length} tài nguyên sẽ được chuyển vào thùng rác. Bạn có thể khôi phục sau.`,async () => {
      let done = 0;
      try {for (const item of items) {await api(`nodes/${item.id}`,'DELETE');done++;}} catch (e) {clearSelection();await load(true);throw new Error(`${done} tài nguyên đã vào thùng rác. ${e.message}`);}
      clearSelection();toast(`Đã chuyển ${done} tài nguyên vào thùng rác.`);await load(true);
    });
  }
  function download(item) {const link = document.createElement('a');const url = new URL(item.url);url.searchParams.set('download','1');link.href = url.href;link.download = item.name;document.body.append(link);link.click();link.remove();}
  function preview(item) {
    const type = typeOf(item);
    const media = type === 'image' ? `<img src="${esc(item.url)}" alt="${esc(item.name)}">` : type === 'video' ? `<video src="${esc(item.url)}" controls playsinline></video>` : `${icon('file','large-icon')}<p class="modal-body-text">Tải xuống để xem nội dung ${esc(item.extension?.toUpperCase())}.</p>`;
    modal(item.name,`<div class="preview-layout"><div class="modal-preview">${media}</div><div><div class="preview-info"><div><span>Loại file</span><strong>${esc(item.mime)}</strong></div><div><span>Dung lượng</span><strong>${bytes(item.size)}</strong></div>${item.width ? `<div><span>Kích thước</span><strong>${item.width} × ${item.height} px</strong></div>` : ''}<div><span>Không gian</span><strong>${item.visibility === 'private' ? 'Riêng tư' : 'Thư viện chung'}</strong></div><div><span>Ngày tải lên</span><strong>${date(item.created_at)}</strong></div></div><div class="preview-actions"><button class="button secondary" id="preview-download">${icon('download')}Tải xuống</button><button class="button secondary" id="copy-url">${icon('link')}Sao chép URL</button>${type === 'image' && item.permissions.update ? `<button class="button primary" id="edit-image">${icon('spark')}Chỉnh sửa ảnh</button>` : ''}</div>${item.visibility === 'private' ? '<p class="editor-hint" style="margin-top:12px">URL riêng tư yêu cầu đăng nhập và quyền xem.</p>' : ''}</div></div>`,[{label:'Đóng',run:() => $('modal').close()}],true);
    $('preview-download').onclick = () => download(item);
    $('copy-url').onclick = async () => {try {await navigator.clipboard.writeText(item.url);toast('Đã sao chép đường dẫn.');}catch (_) {toast('Trình duyệt chưa cho phép sao chép. Hãy sao chép URL từ thanh địa chỉ.',true);}};
    if ($('edit-image')) $('edit-image').onclick = () => editor(item);
  }
  function editor(item) {
    modal('Chỉnh sửa hình ảnh',`<div class="editor-layout"><div><div class="editor-preview"><canvas id="editor-canvas"></canvas></div><p class="editor-hint" style="margin-top:10px">Lưu thành file mới. Ảnh gốc luôn được giữ lại.</p></div><div><div class="field-row"><label class="field"><span>Chiều rộng (px)</span><input id="image-width" type="number" min="1" max="8192" value="${item.width}"></label><label class="field"><span>Chiều cao (px)</span><input id="image-height" type="number" min="1" max="8192" value="${item.height}"></label></div><label class="check-field"><input type="checkbox" id="keep-ratio" checked>Giữ tỉ lệ ảnh</label><label class="check-field"><input type="checkbox" id="enable-crop">Cắt ảnh theo tọa độ</label><div id="crop-fields" hidden><div class="field-row"><label class="field"><span>X</span><input id="crop-x" type="number" min="0" value="0"></label><label class="field"><span>Y</span><input id="crop-y" type="number" min="0" value="0"></label></div><div class="field-row"><label class="field"><span>Rộng</span><input id="crop-width" type="number" min="1" value="${item.width}"></label><label class="field"><span>Cao</span><input id="crop-height" type="number" min="1" value="${item.height}"></label></div></div><label class="field"><span>Định dạng đầu ra</span><select id="image-format"><option value="webp">WebP · tối ưu cho website</option><option value="jpg">JPEG</option><option value="png">PNG · giữ nền trong suốt</option></select></label><label class="check-field"><input type="checkbox" id="enable-watermark">Chèn watermark</label><div id="watermark-fields" hidden><label class="field"><span>Nội dung watermark</span><input id="watermark-text" value="${esc(config.brand.watermark)}" maxlength="100"></label><label class="field"><span>Vị trí</span><select id="watermark-position"><option value="bottom-right">Dưới bên phải</option><option value="bottom-left">Dưới bên trái</option><option value="top-right">Trên bên phải</option><option value="top-left">Trên bên trái</option><option value="center">Chính giữa</option></select></label></div></div></div>`,[cancel,{label:'Lưu bản mới',kind:'primary',run:async () => {
      const options = {format:$('image-format').value,width:Number($('image-width').value),height:Number($('image-height').value)};
      if ($('enable-crop').checked) options.crop = {x:Number($('crop-x').value),y:Number($('crop-y').value),width:Number($('crop-width').value),height:Number($('crop-height').value)};
      if ($('enable-watermark').checked) options.watermark = {text:$('watermark-text').value,position:$('watermark-position').value};
      await mutate(`nodes/${item.id}/transform`,'POST',options,'Đã lưu ảnh mới và tạo thumbnail.');$('modal').close();
    }}],true);
    const source = new Image(); source.src = item.url;
    function redraw() {
      if (!source.complete || !source.naturalWidth || !$('editor-canvas')) return;
      const crop = $('enable-crop').checked ? [Number($('crop-x').value),Number($('crop-y').value),Number($('crop-width').value),Number($('crop-height').value)] : [0,0,source.naturalWidth,source.naturalHeight];
      const w = Number($('image-width').value), h = Number($('image-height').value);
      if (w < 1 || h < 1 || crop[2] < 1 || crop[3] < 1) return;
      const ratio = Math.min(1,600 / w,500 / h); const canvas = $('editor-canvas');canvas.width = Math.max(1,Math.round(w * ratio));canvas.height = Math.max(1,Math.round(h * ratio));
      const ctx = canvas.getContext('2d');ctx.drawImage(source,...crop,0,0,canvas.width,canvas.height);
      if ($('enable-watermark').checked) {
        const text = $('watermark-text').value, pos = $('watermark-position').value;ctx.font = `${Math.max(10,canvas.width / 35)}px sans-serif`;
        const tw = ctx.measureText(text).width, th = Math.max(10,canvas.width / 35), pad = 15;
        let x = pos.includes('left') ? pad : canvas.width - tw - pad, y = pos.includes('top') ? pad + th : canvas.height - pad;
        if (pos === 'center') {x = (canvas.width - tw)/2;y = (canvas.height + th)/2;}
        ctx.fillStyle = '#0007';ctx.fillText(text,x + 1,y + 1);ctx.fillStyle = '#ffffffdc';ctx.fillText(text,x,y);
      }
    }
    source.onload = redraw; source.onerror = () => toast('Không thể tải ảnh gốc.',true);
    $('enable-crop').onchange = () => {$('crop-fields').hidden = !$('enable-crop').checked;redraw();};
    $('enable-watermark').onchange = () => {$('watermark-fields').hidden = !$('enable-watermark').checked;redraw();};
    for (const field of $('modal-body').querySelectorAll('input,select')) field.addEventListener('input',() => {
      const ratio = $('enable-crop').checked ? Number($('crop-width').value)/Number($('crop-height').value) : item.width/item.height;
      if ($('keep-ratio').checked && Number.isFinite(ratio) && ratio > 0) {
        if (field.id === 'image-width') $('image-height').value = Math.max(1,Math.round(Number(field.value)/ratio));
        if (field.id === 'image-height') $('image-width').value = Math.max(1,Math.round(Number(field.value)*ratio));
      }
      redraw();
    });
  }
  async function grants(item) {
    try {
      const result = await api(`nodes/${item.id}/grants`);
      modal('Phân quyền tài nguyên',`<p class="modal-body-text">Quyền trên thư mục được kế thừa xuống các tài nguyên bên trong. Chủ sở hữu giữ quyền quản lý.</p><div id="grant-list">${result.data.map((g) => `<div class="grant-row"><div><strong>Người dùng #${esc(g.user_id)}</strong><br><small>${['view','upload','update','delete'].filter((p) => g[p]).map((p) => ({view:'Xem',upload:'Tải lên',update:'Sửa',delete:'Xóa'}[p])).join(' · ') || 'Không có quyền'}</small></div><button class="text-button danger" data-revoke="${esc(g.user_id)}">Thu hồi</button></div>`).join('')}</div><label class="field" style="margin-top:20px"><span>ID người dùng</span><input id="grant-user" placeholder="Nhập ID người dùng cần cấp quyền" maxlength="191"></label><div class="grant-permissions">${[['view','Xem'],['upload','Tải lên'],['update','Sửa'],['delete','Xóa']].map(([p,label]) => `<label class="check-field"><input type="checkbox" id="grant-${p}" ${p === 'view' ? 'checked' : ''}>${label}</label>`).join('')}</div>`,[cancel,{label:'Lưu quyền',kind:'primary',run:async () => {const user_id = $('grant-user').value.trim();if (!user_id) throw new Error('Nhập ID người dùng cần cấp quyền.');const data = {user_id};for (const p of ['view','upload','update','delete']) data[p] = $(`grant-${p}`).checked;await api(`nodes/${item.id}/grants`,'PUT',data);toast('Đã cập nhật quyền.');await grants(item);}}]);
      $('grant-list').querySelectorAll('[data-revoke]').forEach((el) => el.onclick = async () => {try {await api(`nodes/${item.id}/grants/${encodeURIComponent(el.dataset.revoke)}`,'DELETE');toast('Đã thu hồi quyền.');await grants(item);}catch (e) {toast(e.message,true);}});
    } catch (e) {toast(e.message,true);}
  }
  let runningUploads = 0;
  async function uploadFiles(files) {
    if (!state.canUpload) {toast('Bạn không có quyền tải lên thư mục này.',true);return;}
    if (!files.length) return;
    if (runningUploads) {toast('Đợi lượt tải lên hiện tại hoàn tất.',true);return;}
    if (files.length > config.upload.maxFiles) {toast(`Mỗi lượt tối đa ${config.upload.maxFiles} file.`,true);return;}
    const parent = state.parent, visibility = state.tree.find((x) => x.id === parent)?.visibility || (state.scope === 'private' ? 'private' : 'shared');
    const queue = [...files].map((file,i) => ({file,id:i,progress:0,status:'waiting',error:''}));
    runningUploads = queue.length; $('uploads').hidden = false; renderQueue(queue);
    let index = 0, done = 0;
    async function worker() {
      while (index < queue.length) {
        const entry = queue[index++]; entry.status = 'uploading';
        try {
          const ext = entry.file.name.split('.').at(-1).toLowerCase();
          if (!config.upload.extensions.includes(ext)) throw new Error('Loại file không được cho phép.');
          if (entry.file.size > config.upload.maxKb * 1024) throw new Error(`File vượt ${bytes(config.upload.maxKb * 1024)}.`);
          await new Promise((resolve,reject) => {
            const xhr = new XMLHttpRequest(), data = new FormData();data.append('files[]',entry.file);data.append('visibility',visibility);if (parent) data.append('parent_id',parent);
            xhr.open('POST',`${config.base}/api/upload`);xhr.setRequestHeader('Accept','application/json');xhr.setRequestHeader('X-CSRF-TOKEN',config.csrf);xhr.timeout = 120000;
            xhr.upload.onprogress = (event) => {if (event.lengthComputable) {entry.progress = Math.round(event.loaded / event.total * 100);renderQueue(queue);}};
            xhr.onload = () => {let result;try {result = JSON.parse(xhr.responseText);}catch (_) {result = {};}if (xhr.status >= 200 && xhr.status < 300) resolve(result);else reject(new Error(xhr.status === 419 ? 'Phiên hết hạn. Tải lại trang.' : Object.values(result.errors || {}).flat()[0] || result.message || 'Tải lên thất bại.'));};
            xhr.onerror = () => reject(new Error('Mất kết nối. Hãy thử tải lại.'));xhr.ontimeout = () => reject(new Error('Tải lên quá thời gian.'));xhr.send(data);
          });
          entry.progress = 100;entry.status = 'done';done++;
        } catch (error) {entry.status = 'error';entry.error = error.message;}
        finally {runningUploads--;renderQueue(queue);}
      }
    }
    await Promise.all(Array.from({length:Math.min(3,queue.length)},worker));
    toast(`Đã tải lên ${done}/${queue.length} file.`, done !== queue.length);await load(true);$('file-input').value = '';
  }
  function renderQueue(queue) {
    $('queue-title').textContent = runningUploads ? `Đang tải lên · ${queue.filter((x) => x.status === 'done').length}/${queue.length}` : 'Đã hoàn tất lượt tải lên';
    $('queue-items').innerHTML = queue.map((x) => `<div class="queue-item ${x.status === 'error' ? 'error' : ''}"><div class="queue-name"><span>${esc(x.file.name)}</span><span>${x.status === 'done' ? '✓ Hoàn tất' : x.status === 'error' ? 'Thất bại' : x.status === 'waiting' ? 'Đang chờ' : x.progress >= 100 ? 'Đang xử lý…' : `${x.progress}%`}</span></div><div class="queue-progress"><span style="width:${x.progress}%"></span></div>${x.error ? `<div class="queue-error">${esc(x.error)}</div>` : ''}</div>`).join('');
    $('close-queue').disabled = !!runningUploads;
  }
  $('close-queue').onclick = () => $('uploads').hidden = true;
  $('upload-button').onclick = () => $('file-input').click();
  $('dropzone').onclick = () => $('file-input').click();
  $('dropzone').onkeydown = (event) => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();$('file-input').click();}};
  $('file-input').onchange = () => uploadFiles($('file-input').files);
  for (const type of ['dragenter','dragover']) $('dropzone').addEventListener(type,(event) => {event.preventDefault();$('dropzone').classList.add('drag-over');});
  $('dropzone').addEventListener('dragleave',(event) => {if (!$('dropzone').contains(event.relatedTarget)) $('dropzone').classList.remove('drag-over');});
  $('dropzone').addEventListener('drop',(event) => {event.preventDefault();$('dropzone').classList.remove('drag-over');uploadFiles(event.dataTransfer.files);});
  document.addEventListener('dragover',(event) => event.preventDefault());document.addEventListener('drop',(event) => event.preventDefault());
  $('new-folder').onclick = folder; $('sidebar-new-folder').onclick = folder;
  document.querySelectorAll('[data-scope]').forEach((el) => el.onclick = () => nav(el.dataset.scope));
  document.querySelectorAll('[data-type]').forEach((el) => el.onclick = () => {state.type = el.dataset.type;state.page = 1;clearSelection();load();});
  $('sort').onchange = () => {state.sort = $('sort').value;state.page = 1;load();};
  $('search').oninput = () => {clearTimeout(searchTimer);searchTimer = setTimeout(() => {state.q = $('search').value.trim();state.page = 1;clearSelection();load();},300);};
  for (const view of ['grid','list']) $(`${view}-view`).onclick = () => {state.view = view;try {localStorage.setItem('kbtech:media:view',view);}catch (_) {}load();};
  $('select-all').onchange = () => {const checked = $('select-all').checked;state.items.filter((x) => x.kind === 'file' && !x.deleted_at).forEach((x) => select(x,checked));};
  $('clear-selection').onclick = clearSelection;$('batch-move').onclick = () => move([...state.selected.values()]);$('batch-trash').onclick = () => trash([...state.selected.values()]);
  $('close-modal').onclick = () => $('modal').close();
  $('modal').addEventListener('click',(event) => {if (event.target === $('modal')) {const r = $('modal').getBoundingClientRect();if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('modal').close();}});
  $('modal').addEventListener('close',() => {$('modal-body').querySelectorAll('video').forEach((v) => v.pause());});
  const mobileQuery = matchMedia('(max-width:700px)');
  function syncSidebar() {
    $('sidebar').inert = mobileQuery.matches && !$('sidebar').classList.contains('open');
    $('menu-toggle').setAttribute('aria-expanded',String($('sidebar').classList.contains('open')));
  }
  mobileQuery.addEventListener('change',syncSidebar);
  $('menu-toggle').onclick = () => {$('sidebar').classList.toggle('open');$('sidebar-shade').classList.toggle('open');syncSidebar();};
  $('sidebar-shade').onclick = () => {$('sidebar').classList.remove('open');$('sidebar-shade').classList.remove('open');syncSidebar();};
  syncSidebar();
  document.addEventListener('keydown',(event) => {if (event.key === '/' && !$('modal').open && !['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)) {event.preventDefault();$('search').focus();}});
  $('confirm-picker').onclick = () => {
    const files = [...state.selected.values()].map(({id,name,url,mime,size,width,height,visibility}) => ({id,name,url,mime,size,width,height,visibility}));
    if (!files.length) return;
    const target = window.opener || (window.parent !== window ? window.parent : null);
    if (!target) {toast('Hãy mở thư viện từ bộ chọn file của ứng dụng.',true);return;}
    target.postMessage({type:'kbtech:file-selected',channel:config.channel,files},location.origin);
    if (window.opener) window.close();
  };
  load(true);
})();
