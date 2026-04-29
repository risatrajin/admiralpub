/* ═══════════════════════════════════════════
   ADMIRAL PUB — SHARED.JS
   Runs on every page: theme, nav, toast
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavScroll();
  initReveal();
  markActiveNavLink();
});

/* ── THEME ── */
function initTheme() {
  const saved = localStorage.getItem('admiral-theme') || 'dark';
  setTheme(saved);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const current = document.documentElement.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('admiral-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  updateLogos(theme);
}

function updateLogos(theme) {
  const logoSrc = theme === 'dark' ? 'Image/Logo.svg' : 'Image/ADMIRAL-Light-logo.png';
  const navLogo = document.getElementById('navLogo');
  const footerLogo = document.getElementById('footerLogo');
  if (navLogo) navLogo.src = logoSrc;
  if (footerLogo) footerLogo.src = logoSrc;
}

/* ── NAV SCROLL ── */
function initNavScroll() {
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ── ACTIVE NAV LINK ── */
function markActiveNavLink() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .nav-page-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active-link');
    }
  });
}

/* ── REVEAL ON SCROLL ── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 60);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(el => observer.observe(el));
}

/* ── TOAST ── */
function showToast(msg, type = 'success') {
  const el = document.getElementById('toastMsg');
  const body = document.getElementById('toastBody');
  if (!el || !body) return;
  body.textContent = msg;
  el.className = `toast align-items-center border-0 toast-${type}`;
  new bootstrap.Toast(el, { delay: 4000 }).show();
}

/* ── CLOSE MOBILE MENU AFTER CLICK ── */
document.addEventListener('click', (e) => {
  if (e.target.closest('.navbar-collapse a')) {
    const toggler = document.querySelector('.navbar-toggler');
    const menu = document.getElementById('navMenu');
    if (menu?.classList.contains('show')) toggler?.click();
  }
});
