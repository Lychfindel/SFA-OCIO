// Alert banner close
function chiudiBanner() {
  const banner = document.getElementById('alert-banner');
  if (banner) {
    banner.style.transition = 'opacity 0.3s';
    banner.style.opacity = '0';
    setTimeout(() => {
      banner.remove();
      // Re-sync hero padding after banner disappears
      adjustHeroPadding();
    }, 300);
  }
}

function adjustHeroPadding() {
  const header = document.getElementById('sticky-header');
  const hero = document.querySelector('.hero, .page-hero, .speaker-hero');
  if (hero) {
    const h = header ? header.offsetHeight : 64;
    hero.style.paddingTop = (h + 32) + 'px';
  }
}

// Nav active state
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.nav-links a');
  const path = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach(l => {
    const href = l.getAttribute('href').split('/').pop();
    if (href === path) l.classList.add('active');
  });
});

// Hamburger menu
function toggleMenu() {
  document.querySelector('nav').classList.toggle('nav-mobile-open');
}

// Close menu on link click
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelector('nav').classList.remove('nav-mobile-open');
    });
  });
});

// Tab switching for program
function switchTab(day) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.tab-btn[data-day="${day}"]`).classList.add('active');
  document.getElementById(`day-${day}`).classList.add('active');
}
