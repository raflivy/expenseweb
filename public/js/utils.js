// Modern Alert/Notification system
class AlertManager {
  constructor() {
    this.container = this.createContainer();
    this.alertCount = 0;
  }

  createContainer() {
    const container = document.createElement("div");
    container.className = "alert-container";
    document.body.appendChild(container);
    return container;
  }

  show(message, type = "info", duration = 4000) {
    const alert = document.createElement("div");
    alert.className = `alert ${type}`;

    const iconMap = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ⓘ",
    };

    alert.innerHTML = `
            <div class="alert-icon">${iconMap[type] || iconMap.info}</div>
            <div class="alert-content">${message}</div>
            <button class="alert-close" onclick="this.parentElement.remove()">×</button>
            <div class="alert-progress"></div>
        `;

    this.container.appendChild(alert);

    // Auto remove after duration
    const timeout = setTimeout(() => {
      this.remove(alert);
    }, duration);

    // Clear timeout if manually closed
    alert.addEventListener("click", (e) => {
      if (e.target.classList.contains("alert-close")) {
        clearTimeout(timeout);
        this.remove(alert);
      }
    });

    // Add some breathing room between alerts
    this.alertCount++;
    if (this.alertCount > 3) {
      const firstAlert = this.container.firstElementChild;
      if (firstAlert) {
        this.remove(firstAlert);
      }
    }

    return alert;
  }

  remove(alert) {
    if (alert && alert.parentElement) {
      alert.classList.add("removing");
      setTimeout(() => {
        if (alert.parentElement) {
          alert.remove();
          this.alertCount = Math.max(0, this.alertCount - 1);
        }
      }, 300);
    }
  }

  success(message, duration = 4000) {
    return this.show(message, "success", duration);
  }

  error(message, duration = 5000) {
    return this.show(message, "error", duration);
  }

  warning(message, duration = 4500) {
    return this.show(message, "warning", duration);
  }

  info(message, duration = 4000) {
    return this.show(message, "info", duration);
  }

  clear() {
    this.container.innerHTML = "";
    this.alertCount = 0;
  }
}

// Global alert instance (replacing old notifications)
window.notifications = new AlertManager();
window.alerts = window.notifications; // Alias

// Utility functions
window.utils = {
  // Format currency
  formatCurrency(amount) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(amount || 0);
  },

  // Format date
  formatDate(dateString, options = {}) {
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Jakarta",
    };
    return new Date(dateString).toLocaleDateString("id-ID", {
      ...defaultOptions,
      ...options,
    });
  },

  // Get current date in YYYY-MM-DD format
  getCurrentDate() {
    return new Date().toISOString().split("T")[0];
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Generate random color
  randomColor() {
    const colors = [
      "#EF4444",
      "#F59E0B",
      "#10B981",
      "#3B82F6",
      "#8B5CF6",
      "#EC4899",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // Get emoji for category
  getCategoryEmoji(categoryName) {
    const emojis = {
      makanan: "🍔",
      transportasi: "🚗",
      belanja: "🛒",
      hiburan: "🎬",
      kesehatan: "🏥",
      lainnya: "📦",
    };
    return emojis[categoryName.toLowerCase()] || "💰";
  },

  // Storage helpers
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error("Storage set error:", e);
      }
    },

    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.error("Storage get error:", e);
        return defaultValue;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error("Storage remove error:", e);
      }
    },
  },
};

// API helper
window.api = {
  async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, finalOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("API request error:", error);
      throw error;
    }
  },

  async get(url) {
    return this.request(url);
  },

  async post(url, data) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async put(url, data) {
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(url) {
    return this.request(url, {
      method: "DELETE",
    });
  },
};

// Touch gesture support for mobile
class TouchGestureManager {
  constructor() {
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.minSwipeDistance = 50;
  }

  init() {
    document.addEventListener("touchstart", this.handleTouchStart.bind(this), {
      passive: true,
    });
    document.addEventListener("touchend", this.handleTouchEnd.bind(this), {
      passive: true,
    });
  }

  handleTouchStart(e) {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
  }

  handleTouchEnd(e) {
    this.endX = e.changedTouches[0].clientX;
    this.endY = e.changedTouches[0].clientY;
    this.handleSwipe();
  }

  handleSwipe() {
    const deltaX = this.endX - this.startX;
    const deltaY = this.endY - this.startY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > this.minSwipeDistance) {
        if (deltaX > 0) {
          this.onSwipeRight();
        } else {
          this.onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > this.minSwipeDistance) {
        if (deltaY > 0) {
          this.onSwipeDown();
        } else {
          this.onSwipeUp();
        }
      }
    }
  }

  onSwipeLeft() {
    // Can be overridden by specific implementations
    console.log("Swipe left detected");
  }

  onSwipeRight() {
    // Can be overridden by specific implementations
    console.log("Swipe right detected");
  }

  onSwipeUp() {
    // Can be overridden by specific implementations
    console.log("Swipe up detected");
  }

  onSwipeDown() {
    // Can be overridden by specific implementations
    console.log("Swipe down detected");
  }
}

// Initialize touch gestures
const touchGestures = new TouchGestureManager();
touchGestures.init();

// PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

// PWA Installation features
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstallable = false;
    this.isInstalled = false;
    this.init();
  }

  init() {
    // Check if app is installed
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      this.isInstalled = true;
      return;
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("✅ ServiceWorker registered: ", registration);
          })
          .catch((error) => {
            console.log("❌ ServiceWorker registration failed: ", error);
          });
      });
    }

    // Listen for beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent Chrome 76+ from showing the mini-infobar
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      this.isInstallable = true;

      // Notify app that installation is available
      if (window.Alpine) {
        const appData = document.querySelector("[x-data]")?.__x?.data;
        if (appData && typeof appData.showInstallBanner === "function") {
          appData.showInstallBanner();
        }
      }
    });

    // Track when the app is installed
    window.addEventListener("appinstalled", (evt) => {
      this.isInstalled = true;
      this.isInstallable = false;
      console.log("✅ App was installed");

      // Hide install banner if it's showing
      if (window.Alpine) {
        const appData = document.querySelector("[x-data]")?.__x?.data;
        if (appData && typeof appData.hideInstallBanner === "function") {
          appData.hideInstallBanner();
        }
      }

      // Show success message
      if (window.notifications) {
        notifications.success("App successfully installed!");
      }
    });
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log("❌ No installation prompt available");
      return;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await this.deferredPrompt.userChoice;

    // Reset the deferred prompt variable
    this.deferredPrompt = null;

    return choiceResult.outcome === "accepted";
  }

  canInstall() {
    return this.isInstallable && !this.isInstalled;
  }
}

// Initialize PWA installer
window.pwaInstaller = new PWAInstaller();

// Navbar animation controller
class NavbarController {
  constructor() {
    this.init();
  }

  init() {
    // Wait for Alpine.js and DOM to be ready
    document.addEventListener("alpine:init", () => {
      this.setupNavbarAnimations();
    });
  }
  setupNavbarAnimations() {
    const navItems = document.querySelectorAll(
      ".modern-navbar li:not(.follow)"
    );
    const navbar = document.querySelector(".modern-navbar");
    const body = document.body;
    const follow = document.querySelector(".modern-navbar li.follow");

    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        if (item.classList.contains("follow")) {
          return;
        }

        // Remove active class from all items
        navItems.forEach((navItem) => navItem.classList.remove("active"));

        // Add active class to clicked item
        item.classList.add("active");

        // Calculate and set follow position dynamically
        if (follow) {
          const rect = item.getBoundingClientRect();
          const navRect = navbar.getBoundingClientRect();
          const relativeLeft = rect.left - navRect.left + rect.width / 2 - 30;
          follow.style.left = `${relativeLeft}px`;
        }

        // Update styling based on active item
        const dataWhere = item.getAttribute("data-where");
        if (dataWhere && navbar && body) {
          // Remove all style classes
          const styleClasses = ["home-style", "add-style", "reports-style"];
          styleClasses.forEach((cls) => {
            navbar.classList.remove(cls);
            body.classList.remove(cls);
          });

          // Add new style
          const newStyle = `${dataWhere}-style`;
          navbar.classList.add(newStyle);
          body.classList.add(newStyle);
        }

        // Trigger Alpine.js data update if needed
        const alpineData = window.Alpine?.store || {};
        if (alpineData.expenseTracker) {
          // Update active tab in Alpine data
          const appElement = document.body;
          if (appElement._x_dataStack) {
            const data = appElement._x_dataStack[0];
            if (data && data.setActiveTab) {
              data.setActiveTab(dataWhere);
            }
          }
        }
      });
    });

    // Set initial active state
    setTimeout(() => {
      const homeTab = document.querySelector(".modern-navbar .home");
      if (homeTab && !document.querySelector(".modern-navbar .active")) {
        homeTab.classList.add("active");

        // Set initial follow position
        if (follow) {
          const rect = homeTab.getBoundingClientRect();
          const navRect = navbar.getBoundingClientRect();
          const relativeLeft = rect.left - navRect.left + rect.width / 2 - 30;
          follow.style.left = `${relativeLeft}px`;
        }

        if (navbar && body) {
          navbar.classList.add("home-style");
          body.classList.add("home-style");
        }
      }
    }, 200);
  }
}

// Fix navbar positioning dynamically
function fixNavbarPositioning() {
  const navItems = document.querySelectorAll(".modern-navbar li:not(.follow)");
  const follow = document.querySelector(".modern-navbar li.follow");

  if (!navItems.length || !follow) return;

  // Calculate positions based on actual layout
  navItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      // Get actual position of the clicked item
      const rect = item.getBoundingClientRect();
      const navRect = item.closest(".modern-navbar").getBoundingClientRect();

      // Calculate relative position
      const relativeLeft = rect.left - navRect.left + rect.width / 2 - 30;

      // Apply position to follow element
      follow.style.left = `${relativeLeft}px`;

      // Ensure proper styling for active item
      const activeItem = document.querySelector(".modern-navbar li.active");
      if (activeItem) {
        // Copy background color to follow element for visual consistency
        const computedStyle = window.getComputedStyle(activeItem);
        follow.style.backgroundColor = computedStyle.backgroundColor;
        follow.style.borderColor = computedStyle.backgroundColor;

        // Set shadow to match active item
        follow.style.boxShadow = computedStyle.boxShadow;
      }
    });
  });

  // Initial positioning
  const activeItem = document.querySelector(".modern-navbar li.active");
  if (activeItem && follow) {
    const rect = activeItem.getBoundingClientRect();
    const navRect = activeItem
      .closest(".modern-navbar")
      .getBoundingClientRect();
    const relativeLeft = rect.left - navRect.left + rect.width / 2 - 30;
    follow.style.left = `${relativeLeft}px`;
  }
}

// Initialize after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(fixNavbarPositioning, 100);
});

// Initialize navbar controller
window.navbarController = new NavbarController();
