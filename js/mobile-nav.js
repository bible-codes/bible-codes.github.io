/**
 * Mobile Navigation Component
 * Shared across all pages
 */

export function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  if (!hamburger || !mobileNav) return;

  // Toggle menu on hamburger click
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('active');
    }
  });

  // Close menu when selecting a link (on mobile)
  const navLinks = mobileNav.querySelectorAll('.mobile-nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('active');
      }
    });
  });

  // Highlight active page
  highlightActivePage();
}

function highlightActivePage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/**
 * Create mobile navigation HTML
 * Call this to insert nav into page
 */
export function createMobileNav() {
  return `
    <header class="mobile-header">
      <div class="mobile-header-inner">
        <a href="index.html" class="logo">📖 ניתוח תנ"ך</a>
        <button id="hamburger" class="hamburger" aria-label="תפריט">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <nav id="mobile-nav" class="mobile-nav">
        <ul class="mobile-nav-list">
          <li class="mobile-nav-item">
            <a href="index.html" class="mobile-nav-link">
              <span class="nav-icon">🏠</span>
              <span>דף הבית</span>
            </a>
          </li>
          <li class="mobile-nav-item">
            <a href="index.html" class="mobile-nav-link">
              <span class="nav-icon">🔍</span>
              <span>קודי תורה (ELS)</span>
            </a>
          </li>
          <li class="mobile-nav-item">
            <a href="text-search.html" class="mobile-nav-link">
              <span class="nav-icon">📖</span>
              <span>חיפוש טקסט</span>
            </a>
          </li>
          <li class="mobile-nav-item">
            <a href="gematria.html" class="mobile-nav-link">
              <span class="nav-icon">🔢</span>
              <span>גימטריה</span>
            </a>
          </li>
          <li class="mobile-nav-item">
            <a href="acronym.html" class="mobile-nav-link">
              <span class="nav-icon">✡️</span>
              <span>ראשי תיבות</span>
            </a>
          </li>
          <li class="mobile-nav-item">
            <a href="tsirufim.html" class="mobile-nav-link">
              <span class="nav-icon">🌟</span>
              <span>צירופים</span>
            </a>
          </li>
          <li class="mobile-nav-item">
            <a href="test-roots.html" class="mobile-nav-link">
              <span class="nav-icon">🌱</span>
              <span>בדיקת שורשים</span>
            </a>
          </li>
        </ul>
      </nav>
    </header>
  `;
}
