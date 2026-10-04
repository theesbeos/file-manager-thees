(() => {
  'use strict';

  window.KBTechFilePicker = {
    /**
     * Mở hộp thoại chọn tài nguyên (Modal iFrame)
     */
    open({url = '/file-manager', multiple = false, type = '', onSelect, input, preview} = {}) {
      const target = new URL(url, location.origin);
      if (target.origin !== location.origin) {
        throw new Error('Bộ chọn file yêu cầu cùng origin với ứng dụng.');
      }

      const channel = crypto.randomUUID();
      target.searchParams.set('picker', '1');
      target.searchParams.set('multiple', multiple ? '1' : '0');
      target.searchParams.set('channel', channel);
      if (type) target.searchParams.set('type', type);

      const dialog = document.createElement('dialog');
      dialog.className = 'kbtech-picker-dialog';
      dialog.setAttribute('aria-label', 'Chọn tài nguyên');
      dialog.style.cssText = 'width:min(1280px,96vw);height:90dvh;padding:0;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.28);background:#fff;z-index:999999;';

      const frame = document.createElement('iframe');
      frame.src = target.href;
      frame.title = 'Thư viện tài nguyên';
      frame.style.cssText = 'width:100%;height:100%;border:0;display:block';

      const close = document.createElement('button');
      close.innerHTML = '&times;';
      close.setAttribute('aria-label', 'Đóng bộ chọn file');
      close.style.cssText = 'position:absolute;top:14px;right:14px;border:1px solid #d1d5db;border-radius:50%;width:32px;height:32px;background:rgba(255,255,255,0.9);color:#4b5563;font-size:22px;line-height:1;cursor:pointer;z-index:10;display:grid;place-items:center;transition:all .15s ease;box-shadow:0 2px 6px rgba(0,0,0,0.1);';
      close.onmouseenter = () => { close.style.background = '#f3f4f6'; close.style.color = '#111827'; };
      close.onmouseleave = () => { close.style.background = 'rgba(255,255,255,0.9)'; close.style.color = '#4b5563'; };
      close.onclick = () => dialog.close();

      dialog.append(frame, close);
      document.body.append(dialog);

      const receive = (event) => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'kbtech:file-selected' || event.data.channel !== channel || !Array.isArray(event.data.files)) return;
        const files = event.data.files.filter((f) => Number.isInteger(f.id) && typeof f.url === 'string' && new URL(f.url, location.origin).origin === location.origin);
        if (!files.length || (!multiple && files.length !== 1)) return;

        // Auto update input value
        if (input) {
          const field = typeof input === 'string' ? document.querySelector(input) : input;
          if (field) {
            field.value = multiple ? JSON.stringify(files.map((f) => f.id)) : (field.dataset.return === 'url' ? files[0].url : files[0].id);
            field.dispatchEvent(new Event('change', {bubbles: true}));
            field.dispatchEvent(new Event('input', {bubbles: true}));
          }
        }

        // Auto update preview image
        if (preview) {
          const prevEl = typeof preview === 'string' ? document.querySelector(preview) : preview;
          if (prevEl) {
            const firstImg = files.find((f) => f.mime?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.url));
            if (firstImg) {
              if (prevEl.tagName === 'IMG') {
                prevEl.src = firstImg.url;
              } else {
                prevEl.style.backgroundImage = `url("${firstImg.url}")`;
                prevEl.style.backgroundSize = 'cover';
                prevEl.style.backgroundPosition = 'center';
              }
              prevEl.hidden = false;
            }
          }
        }

        dialog.close();
        if (typeof onSelect === 'function') {
          onSelect(multiple ? files : files[0]);
        }
      };

      window.addEventListener('message', receive);
      dialog.addEventListener('close', () => {
        window.removeEventListener('message', receive);
        dialog.remove();
      }, {once: true});

      dialog.showModal();
      return {close: () => dialog.close()};
    },

    /**
     * Gắn tự động bộ chọn file vào một nút hoặc phần tử trong DOM
     * Ví dụ: KBTechFilePicker.attach('#btn-avatar', {input: '#avatar_id', preview: '#avatar-img', type: 'image'});
     */
    attach(trigger, options = {}) {
      const el = typeof trigger === 'string' ? document.querySelector(trigger) : trigger;
      if (!el) return;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(options);
      });
    },

    /**
     * Tích hợp nhanh với TinyMCE 5 / 6 / 7 file_picker_callback
     * Ví dụ:
     * tinymce.init({
     *   ...,
     *   file_picker_callback: KBTechFilePicker.tinyMCECallback
     * });
     */
    tinyMCECallback(callback, value, meta, customOptions = {}) {
      const fileType = meta.filetype === 'image' ? 'image' : meta.filetype === 'media' ? 'video' : '';
      KBTechFilePicker.open({
        url: customOptions.url || '/file-manager',
        type: fileType,
        multiple: false,
        onSelect: (file) => {
          callback(file.url, {
            alt: file.name,
            title: file.name,
            text: file.name
          });
        },
        ...customOptions
      });
    }
  };
})();
