/**
 * CacheBot — widget flotante SOLO en www.elcache10.com.
 * Habla con https://citas.elcache10.com/api/chat (misma agenda que TV / dashboard).
 * Inyecta su CSS: no depende de style.css del shop (producción vieja lo dejaba invisible).
 * Sin claves API. Sin JWT. sessionStorage solo para el id de conversación.
 */
(function () {
  'use strict';

  var SESSION_KEY = 'cec_cachebot_sid';
  var MAX_HISTORY = 8;

  function apiUrl() {
    if (window.CACHEBOT_API) return String(window.CACHEBOT_API);
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4488/api/chat';
    if (host === 'citas.elcache10.com') return '/api/chat';
    return 'https://citas.elcache10.com/api/chat';
  }

  function onShopSite() {
    var host = location.hostname;
    return host === 'elcache10.com' || host === 'www.elcache10.com';
  }

  function injectStyles() {
    if (document.getElementById('cachebot-styles')) return;
    var style = document.createElement('style');
    style.id = 'cachebot-styles';
    var bottom = onShopSite()
      ? 'calc(8.75rem + env(safe-area-inset-bottom, 0px))'
      : 'max(1.25rem, env(safe-area-inset-bottom, 0px))';
    style.textContent =
      '.cachebot-root{position:fixed;right:max(1.25rem,env(safe-area-inset-right,0px));bottom:' +
      bottom +
      ';z-index:10050;font-family:Segoe UI,system-ui,sans-serif;pointer-events:none}' +
      '.cachebot-launcher,.cachebot-panel{pointer-events:auto}' +
      '.cachebot-launcher{width:56px;height:56px;border:1px solid #d4af37;border-radius:50%;background:#0f172a;color:#d4af37;font-weight:700;font-size:0.8rem;letter-spacing:0.04em;cursor:pointer;box-shadow:0 8px 48px rgba(10,10,10,0.2)}' +
      '.cachebot-launcher:hover,.cachebot-launcher:focus-visible{background:#d4af37;color:#0a0a0a;outline:none}' +
      '.cachebot-panel{width:min(22rem,calc(100vw - 1.5rem));max-height:min(28rem,calc(100vh - 8rem));display:flex;flex-direction:column;background:#0f172a;color:#fff;border:1px solid rgba(212,175,55,0.55);border-radius:10px;box-shadow:0 8px 48px rgba(10,10,10,0.2);overflow:hidden;margin-bottom:0.65rem}' +
      '.cachebot-panel[hidden]{display:none!important}' +
      '.cachebot-head{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.45rem 0.55rem 0.45rem 0.85rem;border-bottom:1px solid rgba(212,175,55,0.35);background:#0a1224}' +
      '.cachebot-title{margin:0;font-size:0.85rem;font-weight:700;color:#d4af37}' +
      '.cachebot-head-actions{display:flex;align-items:center;flex-shrink:0}' +
      '.cachebot-icon-btn,.cachebot-close,.cachebot-min{width:44px;height:44px;min-width:44px;border:0;background:transparent;color:#d4af37;font-size:1.35rem;line-height:1;cursor:pointer}' +
      '.cachebot-icon-btn:hover,.cachebot-icon-btn:focus-visible,.cachebot-close:hover,.cachebot-close:focus-visible,.cachebot-min:hover,.cachebot-min:focus-visible{color:#fff;outline:2px solid #d4af37;outline-offset:-2px}' +
      '.cachebot-log{flex:1;overflow-y:auto;padding:0.75rem;display:flex;flex-direction:column;gap:0.5rem;min-height:10rem}' +
      '.cachebot-msg{max-width:92%;padding:0.45rem 0.65rem;border-radius:8px;font-size:0.85rem;line-height:1.35;white-space:pre-wrap;word-break:break-word}' +
      '.cachebot-msg--assistant{align-self:flex-start;background:#1e293b}' +
      '.cachebot-msg--user{align-self:flex-end;background:rgba(212,175,55,0.18);color:#e8c547}' +
      '.cachebot-form{display:flex;gap:0.4rem;padding:0.65rem;border-top:1px solid rgba(212,175,55,0.25)}' +
      '.cachebot-input{flex:1;min-width:0;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#fff;padding:0.5rem 0.6rem;font:inherit}' +
      '.cachebot-send{border:0;border-radius:6px;background:#d4af37;color:#0a0a0a;font-weight:700;padding:0.5rem 0.7rem;cursor:pointer}';
    document.head.appendChild(style);
  }

  function sessionId() {
    try {
      var id = sessionStorage.getItem(SESSION_KEY);
      if (id && /^[a-zA-Z0-9_-]{8,80}$/.test(id)) return id;
      id =
        window.crypto && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, '').slice(0, 24)
          : 's' + String(Date.now()) + String(Math.random()).slice(2, 10);
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch (e) {
      return 's' + String(Date.now());
    }
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function init() {
    if (!onShopSite() && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    if (document.getElementById('cachebot-root')) return;
    injectStyles();

    var history = [];
    var open = false;
    var sending = false;

    var root = el('div', 'cachebot-root');
    root.id = 'cachebot-root';

    var launcher = el('button', 'cachebot-launcher');
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Reservar cita con CacheBot');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.textContent = 'Cita';

    var panel = el('div', 'cachebot-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat de citas El Caché 10');
    panel.hidden = true;

    var head = el('div', 'cachebot-head');
    var title = el('p', 'cachebot-title');
    title.textContent = 'CacheBot · El Caché 10';
    var actions = el('div', 'cachebot-head-actions');
    var minBtn = el('button', 'cachebot-icon-btn cachebot-min');
    minBtn.type = 'button';
    minBtn.setAttribute('aria-label', 'Minimizar chat');
    minBtn.textContent = '–';
    var closeBtn = el('button', 'cachebot-icon-btn cachebot-close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Cerrar chat');
    closeBtn.textContent = '×';
    actions.appendChild(minBtn);
    actions.appendChild(closeBtn);
    head.appendChild(title);
    head.appendChild(actions);

    var log = el('div', 'cachebot-log');
    log.setAttribute('aria-live', 'polite');

    var form = el('form', 'cachebot-form');
    var input = el('input', 'cachebot-input');
    input.type = 'text';
    input.name = 'cachebot-msg';
    input.maxLength = 800;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Escribe tu mensaje');
    input.placeholder = 'Quiero un corte con Francis';
    var send = el('button', 'cachebot-send');
    send.type = 'submit';
    send.textContent = 'Enviar';
    form.appendChild(input);
    form.appendChild(send);

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(form);
    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    function addBubble(role, text) {
      var row = el('div', 'cachebot-msg cachebot-msg--' + role);
      row.textContent = text;
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    }

    function setOpen(next) {
      open = next;
      panel.hidden = !open;
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
      launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
      launcher.setAttribute(
        'aria-label',
        open ? 'Minimizar chat de CacheBot' : 'Reservar cita con CacheBot'
      );
      if (open) input.focus();
      else launcher.focus();
    }

    launcher.addEventListener('click', function () {
      setOpen(!open);
    });
    minBtn.addEventListener('click', function () {
      setOpen(false);
    });
    closeBtn.addEventListener('click', function () {
      setOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (open && ev.key === 'Escape') {
        ev.preventDefault();
        setOpen(false);
      }
    });

    fetch(apiUrl(), { method: 'GET' })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.mensaje) addBubble('assistant', data.mensaje);
        else {
          addBubble(
            'assistant',
            'Hola. ¿Corte, barba, salón o uñas? Dime barbero y hora — ejemplo: “con Francis hoy a las 4pm”.'
          );
        }
      })
      .catch(function () {
        addBubble(
          'assistant',
          'No pude conectar el chat. Llama al (646) 334-9409 o reserva en https://citas.elcache10.com'
        );
      });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var text = String(input.value || '').trim();
      if (!text || sending) return;
      sending = true;
      input.value = '';
      addBubble('user', text);
      history.push({ role: 'user', text: text });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

      fetch(apiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId(),
          history: history,
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          var reply =
            (out.data && (out.data.message || out.data.error)) ||
            'No pude responder. Llama al (646) 334-9409.';
          addBubble('assistant', reply);
          history.push({ role: 'assistant', text: reply });
          if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
        })
        .catch(function () {
          addBubble('assistant', 'Error de red. Llama al (646) 334-9409 o usa https://citas.elcache10.com');
        })
        .then(function () {
          sending = false;
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
