/**
 * PWA Install Prompt
 * Provides a user-friendly install button and banner for Progressive Web App installation
 */

let deferredPrompt = null;
let installButton = null;
let installBanner = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPWAInstall);
} else {
  initPWAInstall();
}

function initPWAInstall() {
  // Create install button
  createInstallButton();

  // Create install banner (shows on first visit)
  createInstallBanner();

  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: beforeinstallprompt event fired');

    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show the install button
    showInstallButton();

    // Show banner if not dismissed before
    if (!localStorage.getItem('pwa-banner-dismissed')) {
      showInstallBanner();
    }
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('PWA: App installed successfully');

    // Hide the install button and banner
    hideInstallButton();
    hideInstallBanner();

    // Clear the deferredPrompt
    deferredPrompt = null;

    // Mark as installed
    localStorage.setItem('pwa-installed', 'true');

    // Optional: Show success message
    showInstallSuccess();
  });

  // Check if already installed (running in standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('PWA: App is running in standalone mode');
    hideInstallButton();
    hideInstallBanner();
  }
}

function createInstallButton() {
  // Check if button already exists
  if (document.getElementById('pwa-install-button')) {
    installButton = document.getElementById('pwa-install-button');
    return;
  }

  // Create install button HTML
  const buttonHTML = `
    <button id="pwa-install-button" class="pwa-install-btn" style="display: none;" aria-label="Install app">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span class="install-text">Install App</span>
    </button>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .pwa-install-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #3F8EBA;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9999;
      transition: all 0.3s ease;
      animation: slideIn 0.3s ease-out;
    }

    .pwa-install-btn:hover {
      background: #2D6A91;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .pwa-install-btn:active {
      transform: translateY(0);
    }

    .pwa-install-btn svg {
      flex-shrink: 0;
    }

    .pwa-install-success {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      border-radius: 8px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      animation: slideIn 0.3s ease-out, slideOut 0.3s ease-in 2.7s forwards;
    }

    @keyframes slideIn {
      from {
        transform: translateX(120%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(120%);
        opacity: 0;
      }
    }

    @media (max-width: 600px) {
      .pwa-install-btn {
        bottom: 80px; /* Above mobile nav if present */
        right: 10px;
        left: 10px;
        justify-content: center;
      }

      .pwa-install-success {
        bottom: 80px;
        right: 10px;
        left: 10px;
        text-align: center;
      }
    }
  `;

  document.head.appendChild(style);

  // Insert button into body
  document.body.insertAdjacentHTML('beforeend', buttonHTML);
  installButton = document.getElementById('pwa-install-button');

  // Add click handler
  installButton.addEventListener('click', handleInstallClick);
}

async function handleInstallClick() {
  if (!deferredPrompt) {
    console.log('PWA: No deferredPrompt available');
    return;
  }

  // Hide the install button
  hideInstallButton();

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;

  console.log(`PWA: User response: ${outcome}`);

  if (outcome === 'accepted') {
    console.log('PWA: User accepted the install prompt');
  } else {
    console.log('PWA: User dismissed the install prompt');
    // Show button again if user dismissed
    setTimeout(showInstallButton, 3000);
  }

  // Clear the deferredPrompt
  deferredPrompt = null;
}

function showInstallButton() {
  if (installButton) {
    installButton.style.display = 'flex';
    console.log('PWA: Install button shown');
  }
}

function hideInstallButton() {
  if (installButton) {
    installButton.style.display = 'none';
    console.log('PWA: Install button hidden');
  }
}

function showInstallSuccess() {
  const successHTML = `
    <div class="pwa-install-success">
      ✓ App installed successfully!
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', successHTML);

  // Remove after 3 seconds
  setTimeout(() => {
    const successEl = document.querySelector('.pwa-install-success');
    if (successEl) {
      successEl.remove();
    }
  }, 3000);
}

/**
 * Create prominent install banner
 */
function createInstallBanner() {
  // Check if banner already exists
  if (document.getElementById('pwa-install-banner')) {
    installBanner = document.getElementById('pwa-install-banner');
    return;
  }

  // Create banner HTML
  const bannerHTML = `
    <div id="pwa-install-banner" class="pwa-install-banner" style="display: none;">
      <div class="pwa-banner-content">
        <div class="pwa-banner-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </div>
        <div class="pwa-banner-text">
          <strong>Install This App</strong>
          <span>Add to your home screen for offline access and faster loading</span>
        </div>
        <div class="pwa-banner-actions">
          <button id="pwa-banner-install" class="pwa-banner-btn pwa-banner-btn-primary">Install</button>
          <button id="pwa-banner-dismiss" class="pwa-banner-btn pwa-banner-btn-secondary">Not Now</button>
        </div>
      </div>
    </div>
  `;

  // Add banner styles
  const bannerStyle = document.createElement('style');
  bannerStyle.textContent = `
    .pwa-install-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideDown 0.4s ease-out;
    }

    .pwa-banner-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .pwa-banner-icon {
      flex-shrink: 0;
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 8px;
    }

    .pwa-banner-text {
      flex: 1;
      min-width: 200px;
    }

    .pwa-banner-text strong {
      display: block;
      font-size: 18px;
      margin-bottom: 4px;
    }

    .pwa-banner-text span {
      font-size: 14px;
      opacity: 0.9;
    }

    .pwa-banner-actions {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    .pwa-banner-btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .pwa-banner-btn-primary {
      background: white;
      color: #667eea;
    }

    .pwa-banner-btn-primary:hover {
      background: #f0f0ff;
      transform: scale(1.05);
    }

    .pwa-banner-btn-secondary {
      background: transparent;
      color: white;
      border: 2px solid rgba(255,255,255,0.5);
    }

    .pwa-banner-btn-secondary:hover {
      background: rgba(255,255,255,0.1);
      border-color: white;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(-100%);
        opacity: 0;
      }
    }

    @media (max-width: 600px) {
      .pwa-install-banner {
        padding: 12px;
      }

      .pwa-banner-content {
        flex-direction: column;
        text-align: center;
      }

      .pwa-banner-text {
        min-width: 100%;
      }

      .pwa-banner-actions {
        width: 100%;
        justify-content: center;
      }
    }
  `;

  document.head.appendChild(bannerStyle);
  document.body.insertAdjacentHTML('afterbegin', bannerHTML);

  installBanner = document.getElementById('pwa-install-banner');

  // Add event listeners
  document.getElementById('pwa-banner-install')?.addEventListener('click', handleBannerInstall);
  document.getElementById('pwa-banner-dismiss')?.addEventListener('click', handleBannerDismiss);
}

function showInstallBanner() {
  if (installBanner && !localStorage.getItem('pwa-installed')) {
    installBanner.style.display = 'block';
    console.log('PWA: Install banner shown');
  }
}

function hideInstallBanner() {
  if (installBanner) {
    installBanner.style.animation = 'slideUp 0.3s ease-in forwards';
    setTimeout(() => {
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    }, 300);
    console.log('PWA: Install banner hidden');
  }
}

async function handleBannerInstall() {
  if (!deferredPrompt) {
    console.log('PWA: No deferredPrompt available for banner');
    return;
  }

  hideInstallBanner();
  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  console.log(`PWA: User response from banner: ${outcome}`);

  if (outcome === 'dismissed') {
    // Don't show banner again for a week
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  }

  deferredPrompt = null;
}

function handleBannerDismiss() {
  hideInstallBanner();
  // Remember dismissal for a week
  localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  console.log('PWA: User dismissed banner');
}

// Export for use in other modules if needed
window.PWAInstall = {
  show: showInstallButton,
  hide: hideInstallButton,
  showBanner: showInstallBanner,
  hideBanner: hideInstallBanner
};
