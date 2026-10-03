(() => {
  'use strict';
  window.KBTechFilePicker = {
    open({url = '/file-manager', multiple = false, type = '', onSelect, input} = {}) {
      const target = new URL(url,location.origin);
      if (target.origin !== location.origin) throw new Error('Bộ chọn file yêu cầu cùng origin với ứng dụng.');
      const channel = crypto.randomUUID();target.searchParams.set('picker','1');target.searchParams.set('multiple',multiple ? '1' : '0');target.searchParams.set('channel',channel);
      if (type) target.searchParams.set('type',type);
      const dialog = document.createElement('dialog');dialog.setAttribute('aria-label','Chọn tài nguyên');
      dialog.style.cssText = 'width:min(1280px,96vw);height:90dvh;padding:0;border:1px solid #ddd;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px #0004';
      const frame = document.createElement('iframe');frame.src = target.href;frame.title = 'Thư viện tài nguyên';frame.style.cssText = 'width:100%;height:100%;border:0;display:block';
      const close = document.createElement('button');close.textContent = '×';close.setAttribute('aria-label','Đóng bộ chọn file');close.style.cssText = 'position:absolute;top:12px;right:12px;border:1px solid #ddd;border-radius:50%;width:30px;height:30px;background:white;color:#666;font-size:22px;cursor:pointer;z-index:10';close.onclick = () => dialog.close();
      dialog.append(frame,close);document.body.append(dialog);
      const receive = (event) => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'kbtech:file-selected' || event.data.channel !== channel || !Array.isArray(event.data.files)) return;
        const files = event.data.files.filter((f) => Number.isInteger(f.id) && typeof f.url === 'string' && new URL(f.url,location.origin).origin === location.origin);
        if (!files.length || (!multiple && files.length !== 1)) return;
        if (input) {const field = typeof input === 'string' ? document.querySelector(input) : input;if (field) {field.value = multiple ? JSON.stringify(files.map((f) => f.id)) : files[0].id;field.dispatchEvent(new Event('change',{bubbles:true}));}}
        dialog.close();if (typeof onSelect === 'function') onSelect(multiple ? files : files[0]);
      };
      window.addEventListener('message',receive);dialog.addEventListener('close',() => {window.removeEventListener('message',receive);dialog.remove();},{once:true});dialog.showModal();
      return {close:() => dialog.close()};
    }
  };
})();
