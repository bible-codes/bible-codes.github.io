/**
 * PWA Install Prompt
 * Provides a user-friendly install button for Progressive Web App installation
 */

let deferredPrompt = null;
let installButton = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPWAInstall);
} else {
  initPWAInstall();
}

function initPWAInstall() {
  // Create install button
  createInstallButton();

  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: beforeinstallprompt event fired');

    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show the install button
    showInstallButton();
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('PWA: App installed successfully');

    // Hide the install button
    hideInstallButton();

    // Clear the deferredPrompt
    deferredPrompt = null;

    // Optional: Show success message
    showInstallSuccess();
  });

  // Check if already installed (running in standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('PWA: App is running in standalone mode');
    hideInstallButton();
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

// Export for use in other modules if needed
window.PWAInstall = {
  show: showInstallButton,
  hide: hideInstallButton
};
