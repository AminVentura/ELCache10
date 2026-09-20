/* El Caché 10 Barbershop - Optimized */

/** Paste your public Booksy booking URL (Booksy Biz → Profile → Share / "Copy link"). */
const BOOKSY_BOOKING_URL = 'https://elchache10.booksy.com';

let lightboxTrigger = null;

function buildCalendarLink(name, phone, service, haircut, date, time, notes, durationMin) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const end = new Date(start.getTime() + durationMin * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  const title = encodeURIComponent(`Cita: ${name} - ${service}`);
  let details = `Cliente: ${name}\nTel: ${phone}\nServicio: ${service}`;
  if (haircut && service.includes('Barber')) details += `\nCorte: ${haircut}`;
  if (notes) details += `\nNotas: ${notes}`;
  details += `\n\nEl Caché 10 Barbershop\n1942 Harrison Ave, Bronx, NY 10453\nTel: (646) 334-9409`;
  const dates = `${fmt(start)}/${fmt(end)}`;
  const location = encodeURIComponent('1942 Harrison Ave, Bronx, NY 10453');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${encodeURIComponent(details)}&location=${location}&ctz=America/New_York`;
}

let liveStaffRoster = [];

function staffApiUrl() {
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4488/api/staff';
  return 'https://citas.elcache10.com/api/staff';
}

function applyLiveTeam(staff) {
  liveStaffRoster = Array.isArray(staff) ? staff : [];
  const grid = document.getElementById('team-grid');
  if (!grid || !liveStaffRoster.length) return;
  grid.innerHTML = liveStaffRoster
    .map((person) => {
      const name = String(person.name || '');
      const role = String(person.role || '');
      const photo = String(person.photoUrl || 'images/barbers-team.jpg');
      const phone = String(person.phoneE164 || '').replace(/\D/g, '');
      const tel = phone ? `+${phone}` : '+16463349409';
      const wa = phone || '16463349409';
      return `<article class="team-card reveal is-visible">
        <div class="team-card-img-wrap"><img src="${photo}" alt="${name}" loading="lazy" width="400" height="400"></div>
        <div class="team-card-body">
          <h3 class="team-card-name">${name}</h3>
          <p class="team-card-role">${role}</p>
          <div class="team-card-contact-row">
            <a href="tel:${tel}" class="btn btn-primary team-card-btn">Call</a>
            <a href="https://wa.me/${wa}" class="btn btn-whatsapp team-card-btn" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          </div>
          <div class="barber-booking" data-barber-name="${name}">
            <button type="button" class="btn btn-primary barber-booking-toggle">Reservar con ${name}</button>
            <form class="barber-booking-form" hidden>
              <input type="hidden" name="barber" value="${name}">
              <button type="submit" class="btn btn-whatsapp btn-full">Enviar reserva por WhatsApp</button>
            </form>
          </div>
        </div>
      </article>`;
    })
    .join('');
}

async function loadLiveTeam() {
  try {
    const res = await fetch(staffApiUrl(), { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    applyLiveTeam(json.staff);
    initBarberCardsBooking();
  } catch {
    /* La web se queda con las tarjetas del HTML. */
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initEmbeddedFrame();
  initNav();
  initLangSwitcher();
  initBooksyBooking();
  initBooking();
  initBarberCardsBooking();
  initHeader();
  initYear();
  initLightbox();
  initReveal();
  initCollapsibles();
  initBackToTop();
  initScrollProgress();
  loadLiveTeam();
});

/** When the site opens inside Google Translate (iframe), offset fixed header so it sits below their toolbar. */
function initEmbeddedFrame() {
  try {
    if (window.self !== window.top) {
      document.documentElement.classList.add('is-embedded-frame');
    }
  } catch (e) {
    /* cross-origin edge cases */
  }
}

/** URL sent to Google Translate (canonical when https, else live page, else production root). */
function pageUrlForTranslate() {
  const c = document.querySelector('link[rel="canonical"]');
  if (c?.href && /^https?:\/\//i.test(c.href)) return c.href;
  if (/^https?:/i.test(window.location.protocol)) return window.location.href.split('#')[0];
  return 'https://elcache10.com/';
}

function initLangSwitcher() {
  const u = encodeURIComponent(pageUrlForTranslate());
  document.querySelectorAll('[data-google-translate]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tl = btn.getAttribute('data-google-translate');
      window.location.href = `https://translate.google.com/translate?sl=auto&tl=${tl}&u=${u}`;
    });
  });
}

function initBooksyBooking() {
  const url = typeof BOOKSY_BOOKING_URL === 'string' ? BOOKSY_BOOKING_URL.trim() : '';
  const hasBooksy = /^https?:\/\//i.test(url);
  document.querySelectorAll('[data-booksy-book-btn]').forEach((btn) => {
    if (hasBooksy) {
      btn.href = url;
      btn.setAttribute('aria-label', 'Book on Booksy — open live schedule');
      const label = btn.querySelector('.booksy-btn-text');
      if (label) label.textContent = 'Book on Booksy';
    } else {
      btn.href =
        'https://wa.me/16463349409?text=' +
        encodeURIComponent(
          'Hi! Please send me the El Caché 10 Booksy booking link so I can reserve a time online.'
        );
      btn.setAttribute('aria-label', 'Request Booksy booking link on WhatsApp');
      const label = btn.querySelector('.booksy-btn-text');
      if (label) label.textContent = 'Get Booksy link on WhatsApp';
    }
  });
}

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const lb = document.getElementById('lightbox');
      if (lb?.classList.contains('is-open')) closeLightbox();
      else {
        navLinks.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    }
  });
}

function initHeader() {
  const header = document.querySelector('.header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 50 ? '0 2px 20px rgba(0,0,0,0.15)' : '';
  }, { passive: true });
}

function initBooking() {
  const form = document.getElementById('booking-form');
  const btn = document.getElementById('booking-whatsapp-btn');
  const calBtn = document.getElementById('booking-calendar-btn');
  const serviceSelect = document.getElementById('booking-service');
  const haircutWrap = document.getElementById('haircut-type-wrap');
  const staffWrap = document.getElementById('staff-preference-wrap');
  const staffSelect = document.getElementById('booking-staff');
  const dateInput = document.getElementById('booking-date');
  if (!form || !btn) return;

  const today = new Date().toISOString().split('T')[0];
  if (dateInput) dateInput.setAttribute('min', today);

  function liveOptions(kinds) {
    const people = liveStaffRoster.filter((person) => kinds.includes(person.roleKind));
    const rows = people.length
      ? people.map((person) => ({ value: person.name, label: person.name }))
      : [{ value: 'Francis', label: 'Francis (Owner)' }];
    return [{ value: '', label: 'Any available' }, ...rows];
  }

  function updateStaffOptions() {
    if (!staffSelect) return;
    const val = serviceSelect?.value || '';
    let opts = liveOptions(['barber', 'nails', 'salon', 'blowdry']);
    if (val === 'Barber' || val === 'Blow dry / Secado de pelo') opts = liveOptions(['barber', 'blowdry', 'salon']);
    else if (val === 'Manicure' || val === 'Pedicure' || val === 'Acrylic nails') opts = liveOptions(['nails']);
    staffSelect.innerHTML = opts.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
  }

  function toggleHaircutField() {
    const val = serviceSelect?.value || '';
    haircutWrap.style.display = val.includes('Barber') || val === 'Blow dry / Secado de pelo' ? 'block' : 'none';
  }

  serviceSelect?.addEventListener('change', () => {
    toggleHaircutField();
    updateStaffOptions();
  });
  toggleHaircutField();
  updateStaffOptions();

  btn.addEventListener('click', () => {
    const name = document.getElementById('booking-name')?.value?.trim();
    const phone = document.getElementById('booking-phone')?.value?.trim();
    const service = document.getElementById('booking-service')?.value;
    const haircut = document.getElementById('booking-haircut')?.value;
    const staff = document.getElementById('booking-staff')?.value;
    const staffContact = document.getElementById('booking-staff-contact')?.value?.trim();
    const date = document.getElementById('booking-date')?.value;
    const time = document.getElementById('booking-time')?.value;
    const timeAlt = document.getElementById('booking-time-alt')?.value?.trim();
    const notes = document.getElementById('booking-notes')?.value?.trim();

    if (!name || !phone || !service || !date || !time) {
      alert('Please fill in Name, Phone, Service, Date and Time.');
      return;
    }

    let msg = `*Appointment Request - El Caché 10*\n\n`;
    msg += `Name: ${name}\n`;
    msg += `Phone: ${phone}\n`;
    msg += `Service: ${service}\n`;
    if (haircut && service.includes('Barber')) msg += `Haircut/Style: ${haircut}\n`;
    if (staff) msg += `Preferred barber/staff: ${staff}\n`;
    if (staffContact) msg += `Staff (name/WhatsApp): ${staffContact}\n`;
    msg += `Date: ${date}\n`;
    msg += `Preferred Time: ${time}\n`;
    if (timeAlt) msg += `Alternative time if ${time} is taken: ${timeAlt}\n`;
    if (notes) msg += `Notes: ${notes}\n\n`;
    msg += `_If this slot is not available with the requested barber, please suggest the nearest available time. Thanks!_`;

    const durationMin =
      service === 'Manicure' && !service.includes('Barber') ? 45 : 60;
    const calendarLink = buildCalendarLink(name, phone, service, haircut, date, time, notes, durationMin);
    msg += `📅 Add to Calendar (click to save + set reminder):\n${calendarLink}`;

    const url = `https://wa.me/16463349409?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

function initBarberCardsBooking() {
  const bookingCards = document.querySelectorAll('.barber-booking');
  if (!bookingCards.length) return;

  const today = new Date().toISOString().split('T')[0];

  bookingCards.forEach((card) => {
    const toggleBtn = card.querySelector('.barber-booking-toggle');
    const form = card.querySelector('.barber-booking-form');
    const dateInput = form?.querySelector('input[name="date"]');
    const barberName = card.getAttribute('data-barber-name') || 'Barbero';
    const personalWhatsApp =
      card.getAttribute('data-whatsapp') ||
      card.closest('.team-card')?.querySelector('a[href^="https://wa.me/"]')?.getAttribute('href') ||
      'https://wa.me/16463349409';

    if (!toggleBtn || !form) return;

    if (dateInput) dateInput.setAttribute('min', today);

    toggleBtn.addEventListener('click', () => {
      const isHidden = form.hasAttribute('hidden');

      document.querySelectorAll('.barber-booking-form').forEach((otherForm) => {
        if (otherForm !== form) otherForm.setAttribute('hidden', '');
      });

      document.querySelectorAll('.barber-booking-toggle').forEach((otherBtn) => {
        if (otherBtn !== toggleBtn) otherBtn.textContent = `Reservar con ${otherBtn.closest('.barber-booking')?.getAttribute('data-barber-name') || 'barbero'}`;
      });

      if (isHidden) {
        form.removeAttribute('hidden');
        toggleBtn.textContent = 'Ocultar formulario';
      } else {
        form.setAttribute('hidden', '');
        toggleBtn.textContent = `Reservar con ${barberName}`;
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const service = form.querySelector('select[name="service"]')?.value?.trim();
      const date = form.querySelector('input[name="date"]')?.value?.trim();
      const time = form.querySelector('input[name="time"]')?.value?.trim();
      const plate = form.querySelector('input[name="plate"]')?.value?.trim();
      const vehicle = form.querySelector('textarea[name="vehicle"]')?.value?.trim();

      if (!service || !date || !time || !plate || !vehicle) {
        alert('Completa todos los campos requeridos para enviar la cita.');
        return;
      }

      let msg = '*Reserva de cita - El Caché 10*\n\n';
      msg += `Barbero elegido: ${barberName}\n`;
      msg += `Tipo de servicio: ${service}\n`;
      msg += `Fecha: ${date}\n`;
      msg += `Hora preferida: ${time}\n`;
      msg += `Nombre del cliente: ${plate}\n`;
      msg += `Descripción: ${vehicle}\n\n`;
      msg += '_Confirma por WhatsApp, por favor._';

      const separator = personalWhatsApp.includes('?') ? '&' : '?';
      const url = `${personalWhatsApp}${separator}text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
}

function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.querySelector('.lightbox-close');
  if (!lightbox || !lightboxImg) return;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lightbox]');
    if (!trigger) return;
    e.preventDefault();
    lightboxTrigger = trigger;
    lightboxImg.src = trigger.getAttribute('href');
    lightboxImg.alt = lightboxCaption.textContent = trigger.getAttribute('data-caption') || trigger.querySelector('img')?.alt || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  });

  closeBtn?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lightboxTrigger?.focus();
    lightboxTrigger = null;
  }
}

function initReveal() {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
}

function initCollapsibles() {
  const sections = document.querySelectorAll('.collapsible-section');
  if (!sections.length) return;

  sections.forEach((section) => {
    const toggle = section.querySelector('.collapsible-toggle');
    const content = section.querySelector('.collapsible-content');
    if (!toggle || !content) return;

    const open = () => {
      section.classList.add('is-expanded');
      toggle.setAttribute('aria-expanded', 'true');
      const labelEl = toggle.querySelector('.collapsible-toggle-text');
      if (labelEl) {
        const expandedText = toggle.dataset.expandedLabel || 'Mostrar menos';
        labelEl.textContent = expandedText;
      }
    };

    const close = () => {
      section.classList.remove('is-expanded');
      toggle.setAttribute('aria-expanded', 'false');
      const labelEl = toggle.querySelector('.collapsible-toggle-text');
      if (labelEl) {
        const collapsedText = toggle.dataset.collapsedLabel || 'Leer más';
        labelEl.textContent = collapsedText;
      }
    };

    toggle.addEventListener('click', () => {
      const isExpanded = section.classList.contains('is-expanded');
      if (isExpanded) {
        close();
        const top = section.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top, behavior: 'smooth' });
      } else {
        open();
      }
    });

    if (!toggle.hasAttribute('aria-controls') && content.id) {
      toggle.setAttribute('aria-controls', content.id);
    }
    if (!toggle.hasAttribute('aria-expanded')) {
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  const onScroll = () => {
    if (window.scrollY > window.innerHeight * 0.6) {
      btn.classList.add('is-visible');
    } else {
      btn.classList.remove('is-visible');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  onScroll();
}

function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bar.style.display = 'none';
    return;
  }
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.transform = `scaleX(${Math.min(100, Math.max(0, pct)) / 100})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
}
