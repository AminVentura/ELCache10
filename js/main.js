/* El Caché 10 Barbershop - Optimized */
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
  const dates = `${fmt(start)}/${fmt(end)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${encodeURIComponent(details)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initBooking();
  initHeader();
  initYear();
  initLightbox();
});

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
  const serviceSelect = document.getElementById('booking-service');
  const haircutWrap = document.getElementById('haircut-type-wrap');
  const staffWrap = document.getElementById('staff-preference-wrap');
  const staffSelect = document.getElementById('booking-staff');
  const dateInput = document.getElementById('booking-date');
  if (!form || !btn) return;

  const today = new Date().toISOString().split('T')[0];
  if (dateInput) dateInput.setAttribute('min', today);

  const staffOptions = {
    barber: [
      { value: '', label: 'Any available' },
      { value: 'Barber 1', label: 'Barber 1' },
      { value: 'Barber 2', label: 'Barber 2' },
      { value: 'Barber 3', label: 'Barber 3' }
    ],
    nails: [
      { value: '', label: 'Any available' },
      { value: 'Nail technician', label: 'Nail technician' }
    ],
    combo: [
      { value: '', label: 'Any available' },
      { value: 'Barber 1', label: 'Barber 1' },
      { value: 'Barber 2', label: 'Barber 2' },
      { value: 'Barber 3', label: 'Barber 3' },
      { value: 'Nail technician', label: 'Nail technician' }
    ]
  };

  function updateStaffOptions() {
    const val = serviceSelect?.value || '';
    let opts = staffOptions.combo;
    if (val === 'Barber') opts = staffOptions.barber;
    else if (val === 'Manicure' || val === 'Pedicure') opts = staffOptions.nails;
    staffSelect.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  }

  function toggleHaircutField() {
    const val = serviceSelect?.value || '';
    haircutWrap.style.display = val.includes('Barber') ? 'block' : 'none';
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
    if (staff) msg += `Preferred: ${staff}\n`;
    if (staffContact) msg += `Staff (name/WhatsApp): ${staffContact}\n`;
    msg += `Date: ${date}\n`;
    msg += `Preferred Time: ${time}\n`;
    if (notes) msg += `Notes: ${notes}\n\n`;

    const durationMin = service.includes('Manicure') && !service.includes('Barber') && !service.includes('Pedicure') ? 45 : 60;
    const calendarLink = buildCalendarLink(name, phone, service, haircut, date, time, notes, durationMin);
    msg += `📅 Add to Calendar (click to save + set reminder):\n${calendarLink}`;

    const url = `https://wa.me/16463349409?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
