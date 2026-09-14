/* ============================================================
   ANNOINTED QUEENS - share everywhere module
   Floating share button (injected into page bots). Uses the
   native Web Share API when available; otherwise offers
   WhatsApp / X / Facebook / Telegram / Email / Copy link,
   plus a QR code so the store can be opened on any device.
   ============================================================ */
window.SHARE = (function () {
  'use strict';
  function qs(s) { return (window.encodeURIComponent || escape)(s || ''); }
  function base() { return location.protocol + '//' + location.host; }
  function pageUrl() { return location.href; }
  function pageTitle() { var t = (document.title || '').replace(' - Anointed Queens', '').replace(' | Anointed Queens', ''); return t || 'Anointed Queens'; }

  var QR_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  var QR_TEXT_WRAPPER = true;

  var CHANNELS = [
    { id: 'wa', label: 'WhatsApp', ico: 'fa-brands fa-whatsapp', c: '#25D366', build: function (u, t) { return 'https://api.whatsapp.com/send?text=' + qs(t + '\n' + u); } },
    { id: 'x', label: 'X', ico: 'fa-brands fa-x-twitter', c: '#0f1419', build: function (u, t) { return 'https://twitter.com/intent/tweet?text=' + qs(t) + '&url=' + qs(u); } },
    { id: 'fb', label: 'Facebook', ico: 'fa-brands fa-facebook-f', c: '#1877F2', build: function (u) { return 'https://www.facebook.com/sharer/sharer.php?u=' + qs(u); } },
    { id: 'tg', label: 'Telegram', ico: 'fa-brands fa-telegram', c: '#229ED9', build: function (u, t) { return 'https://t.me/share/url?url=' + qs(u) + '&text=' + qs(t); } },
    { id: 'li', label: 'LinkedIn', ico: 'fa-brands fa-linkedin-in', c: '#0A66C2', build: function (u) { return 'https://www.linkedin.com/sharing/share-offsite/?url=' + qs(u); } },
    { id: 'em', label: 'Email', ico: 'fa-solid fa-envelope', c: '#9aa0a6', build: function (u, t) { return 'mailto:?subject=' + qs(t + ' - Anointed Queens') + '&body=' + qs(u); } }
  ];

  function el(id) { return document.getElementById(id); }

  function sheetHTML() {
    var rows = CHANNELS.map(function (c) {
      return '<a class="share-sheet-btn" data-share-ch="' + c.id + '" href="javascript:void 0" style="--sc:' + c.c + '"><i class="' + c.ico + '"></i><span>' + c.label + '</span></a>';
    }).join('');
    return '<div id="shareSheet" class="share-sheet" role="dialog" aria-label="Share Anointed Queens">' +
      '<div class="share-sheet-head"><b><i class="fa-solid fa-share-nodes gold"></i> Share this store</b><button class="share-sheet-close" id="shareClose" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="share-sheet-grid">' + rows + '</div>' +
      '<div class="share-sheet-copy"><button class="share-copy" id="shareCopy"><i class="fa-solid fa-link"></i> Copy link</button></div>' +
      '<div class="share-sheet-qr"><p class="muted" style="text-align:center;font-size:.8rem;margin:0 0 6px">Open on another device</p><div id="shareQr"></div><p class="muted share-qr-note" id="shareQrNote" style="text-align:center;font-size:.75rem;margin:6px 0 0"></p></div>' +
      '</div>';
  }

  function showSheet(u, t) {
    var old = el('shareSheet');
    if (old) old.parentNode.removeChild(old);
    var d = document.createElement('div');
    d.innerHTML = sheetHTML();
    document.body.appendChild(d.firstChild);
    var sheet = el('shareSheet');
    setTimeout(function () { sheet.classList.add('open'); }, 10);

    if (window.navigator.share) {
      var bar = sheet.querySelector('.share-sheet-grid');
      var nativeBtn = document.createElement('a');
      nativeBtn.href = 'javascript:void 0';
      nativeBtn.className = 'share-sheet-btn share-native';
      nativeBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i><span>Share via…</span>';
      nativeBtn.addEventListener('click', function () {
        window.navigator.share({ title: t, text: t, url: u }).catch(function () {});
      });
      bar.insertBefore(nativeBtn, bar.firstChild);
    }

    sheet.querySelectorAll('[data-share-ch]').forEach(function (b) {
      var ch = CHANNELS.find(function (c) { return c.id === b.getAttribute('data-share-ch'); });
      if (ch) b.href = ch.build(u, t);
    });
    el('shareClose').addEventListener('click', function () { closeSheet(); });
    el('shareCopy').addEventListener('click', function () {
      copyText(u).then(function () { var n = el('shareQrNote'); n.textContent = 'Link copied ✓'; });
    });
    loadQR(u);
  }

  function closeSheet() {
    var sheet = el('shareSheet');
    if (sheet) { sheet.classList.remove('open'); setTimeout(function () { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); }, 200); }
  }

  function copyText(textToCopy) {
    var p = new Promise(function (resolve) {
      if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
        window.navigator.clipboard.writeText(textToCopy).then(resolve, function () { fallbackCopy(textToCopy, resolve); });
      } else { fallbackCopy(textToCopy, resolve); }
    });
    return p;
  }

  function fallbackCopy(textToCopy, done) {
    var ta = document.createElement('textarea');
    ta.value = textToCopy;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    done();
  }

  function loadQR(u) {
    var okDone = false;
    function render() {
      if (!window.QRCode) return;
      var box = el('shareQr');
      if (!box) return;
      box.innerHTML = '';
      try { new QRCode(box, { text: u, width: 132, height: 132, colorDark: '#0A0A0A', colorLight: '#F7F3E9' }); okDone = true; var n = el('shareQrNote'); if (n) n.textContent = 'Scan to open on your phone'; } catch (e) {}
    }
    if (window.QRCode) { render(); return; }
    var s = document.createElement('script');
    s.src = QR_CDN;
    s.onload = render;
    s.onerror = function () { var note = el('shareQrNote'); if (note) note.textContent = 'QR unavailable — use the copy link'; };
    document.head.appendChild(s);
    setTimeout(function () { if (!okDone) { var note = el('shareQrNote'); if (note && note.textContent.indexOf('QR') === -1) note.textContent = 'QR unavailable — use the copy link'; } }, 3500);
  }

  function openShare() {
    var u = pageUrl(), t = pageTitle();
    if (window.navigator.share) {
      showSheet(u, t);
      return;
    }
    showSheet(u, t);
  }

  function init() {
    if (typeof window.esc !== 'function') return;
    document.querySelectorAll('[data-share]').forEach(function (host) {
      if (host.getAttribute('data-share-ready') === '1') return;
      host.setAttribute('data-share-ready', '1');
      var btn = document.createElement('button');
      btn.className = 'share-fab';
      btn.setAttribute('aria-label', 'Share Anointed Queens');
      btn.title = 'Share this store on any device';
      btn.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
      btn.addEventListener('click', function (e) { e.stopPropagation(); openShare(); });
      host.appendChild(btn);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    document.addEventListener('click', function (e) {
      var sheet = el('shareSheet');
      if (sheet && !sheet.contains(e.target) && !e.target.closest('.share-fab')) closeSheet();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { open: openShare, init: init };
})();