import { initializeAttribution } from './services/attribution.mjs';
import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import Vueform from "@vueform/vueform";
import vueformConfig from "./vueform.config";

import App from "./App.vue";
import "element-plus/dist/index.css";
import VueBotUI from "./vue-bot-ui";
import { mockData } from "./mock_data";
import i18n from "./i18n";
import geolocationService from "./services/geolocation";

initializeAttribution();

const sidebarWidth = 23

// Viewport management utilities for preventing mobile zoom
const viewportManager = {
  originalViewport: null,
  isManaged: false,

  // Store the original viewport meta tag
  storeOriginalViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      this.originalViewport = viewport.getAttribute('content');
    }
  },

  // Set viewport to prevent zoom
  preventZoom() {
    if (!this.isManaged) {
      this.storeOriginalViewport();
      this.isManaged = true;
    }
    
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    viewport.setAttribute('content', 'width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no');
  },

  // Restore original viewport
  restoreViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && this.originalViewport && this.isManaged) {
      viewport.setAttribute('content', this.originalViewport);
    }
  }
};

// Detect and adjust fixed elements dynamically
function adjustFixedElements(sidebarVisible) {
  const fixedElements = document.querySelectorAll(
    "#main-content *:not(#app *)"
  );

  fixedElements.forEach((element) => {
    const computedStyle = window.getComputedStyle(element);

    if (computedStyle.position === "fixed") {
      element.style.marginRight = sidebarVisible ? `${sidebarWidth}vw` : "";
      element.style.right = sidebarVisible ? "0" : "";
      element.dataset.wasFixed = "true"; // Mark element as previously fixed
    } else if (element.dataset.wasFixed) {
      element.style.marginRight = "";
      element.style.right = "";
      delete element.dataset.wasFixed;
    }
  });
}

// Function to check sidebar visibility
function checkSidebarVisibility() {
  const sidebar = document.getElementById("chatbot-sidebar");
  if (!sidebar) return;

  const isVisible = window.getComputedStyle(sidebar).display !== "none";
  adjustFixedElements(isVisible);
}

// Observe dynamically added fixed elements
function observeFixedElements() {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        checkSidebarVisibility(); // Re-check whenever elements are added
      } else if (
        mutation.type === "attributes" &&
        mutation.target instanceof HTMLElement &&
        (mutation.attributeName === "style" ||
          mutation.attributeName === "class")
      ) {
        const computedStyle = window.getComputedStyle(mutation.target);
        if (
          computedStyle.position === "fixed" ||
          mutation.target.dataset.wasFixed
        ) {
          checkSidebarVisibility(); // Only trigger if `position` changed
        }
      }
    }
  });

  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    observer.observe(mainContent, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }
}

function createAndMountApp(selector) {
  // Initialize Vue app
  let app = createApp(App);

  // Set global properties
  app.config.globalProperties.$dodoCookies = {
    session: "D_SID",
    user: "D_ID",
  };

  app.config.globalProperties.$dodoStyles = {
    breakpoints: {
      small: 576,
      medium: 768,
      large: 992,
    },
    sidebarWidth: sidebarWidth,
  };

  // Make viewport manager available globally
  app.config.globalProperties.$viewportManager = viewportManager;

  // Create and use plugins
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);

  app.use(pinia);
  app.use(VueBotUI);
  app.use(Vueform, vueformConfig);
  app.use(i18n);

  // Mount the app
  app.mount(selector);
}

// Set up mock data for development
if (process.env.NODE_ENV === "development" && !window.bot_parameters) {
  console.log("Using mock data");
  window.bot_parameters = mockData.bot_parameters;
}

const { view, maintenanceMode, maintenanceModePageOption, displayOverridePage, preview } = window.bot_parameters;

// Check maintenance mode for app to be mounted
// If bot settings maintenance mode is enabled required the URL parameter ?chatMaintenanceMode set to true
const maintenanceModeSettings = maintenanceMode;
const maintenanceModeUrlParam = Object.fromEntries(
  new URLSearchParams(window.location.search)
).chatMaintenanceMode;
const isMaintenanceModePageOption = window.location.pathname.includes(`/${maintenanceModePageOption}`);
const isDisplayOverridePage = displayOverridePage && window.location.pathname.includes(`/${displayOverridePage}`);
const maintenanceModeSettingsAndUrlParamOrPageOption =
  maintenanceModeSettings === "on" && (maintenanceModeUrlParam === "true" || isMaintenanceModePageOption);

// If bot maintenanceMode enabled once in a session, doesn't require the URL parameter to be set again
const maintenanceModeSessionStorage = sessionStorage.getItem("bot")
  ? JSON.parse(sessionStorage.getItem("bot")).status.maintenanceMode
  : false;

// Geo-filtering check function
async function checkGeoAccess() {
  const { geoFilterMode, geoCountries } = window.bot_parameters;

  // Bypass geo-filtering if in preview mode or accessed via special URL
  if (preview || maintenanceModeUrlParam === "true") {
    return true;
  }

  // If geo-filtering is disabled, allow access
  if (!geoFilterMode || geoFilterMode === 'off') {
    return true;
  }

  try {
    // Fetch user's country from geolocation service
    const userCountry = await geolocationService.getUserCountry();

    // If country detection fails, default to allowing access (fail-open)
    if (!userCountry) {
      console.warn('Could not detect user country. Allowing access by default.');
      return true;
    }

    // Check access based on filter mode
    const countryList = geoCountries || [];
    const isInList = countryList.includes(userCountry.toUpperCase());

    if (geoFilterMode === 'include') {
      // Include mode: allow only if country is in the list
      return isInList;
    } else if (geoFilterMode === 'exclude') {
      // Exclude mode: allow only if country is NOT in the list
      return !isInList;
    }

    return true;
  } catch (error) {
    console.error('Error checking geo access:', error);
    // On error, default to allowing access (fail-open)
    return true;
  }
}

// Main initialization function
async function initializeApp() {
  // Check if accessed via special page or URL parameter (page display takes precedence)
  const isSpecialPageAccess = maintenanceModeUrlParam === "true" || isMaintenanceModePageOption || isDisplayOverridePage;

  // Check maintenance mode first
  const shouldMount = (
    preview ||
    maintenanceModeSettings === "off" ||
    maintenanceModeSettingsAndUrlParamOrPageOption ||
    maintenanceModeSessionStorage ||
    isDisplayOverridePage // Display override page bypasses maintenance mode
  );

  if (!shouldMount) {
    return; // Don't mount if maintenance mode check fails
  }

  // Check geo-filtering ONLY if NOT accessed via special page/URL
  // Page display override takes precedence over geo-restrictions
  if (!isSpecialPageAccess && !preview) {
    const geoAllowed = await checkGeoAccess();
    if (!geoAllowed) {
      return; // Don't mount if geo-filtering blocks
    }
  }

  // Setup DOM structure
  // document.addEventListener("DOMContentLoaded", function () {
  if (view === "sidebar" || view === "both") {
    let bodyContent = document.body;
    let sidebar;
    if (bodyContent) {
      // Create wrapper and containers
      let wrapper = document.createElement("div");
      wrapper.id = "chatbot-wrapper";

      // Move existing body content
      let mainContainer = document.createElement("div");
      mainContainer.id = "main-content";
      while (document.body.firstChild) {
        mainContainer.appendChild(document.body.firstChild);
      }

      // Create the chatbot sidebar
      sidebar = document.createElement("div");
      sidebar.id = "chatbot-sidebar";

      wrapper.appendChild(mainContainer);
      wrapper.appendChild(sidebar);
      document.body.appendChild(wrapper);

      // Observe sidebar visibility changes
      const sidebarObserver = new IntersectionObserver(
        ([entry]) => {
          adjustFixedElements(entry.isIntersecting);
        },
        { threshold: 0.1 }
      );

      if (sidebar) {
        sidebarObserver.observe(sidebar);
      }

      //  Start observing dynamically added & modified fixed elements
      checkSidebarVisibility();
      observeFixedElements();
    }
  }
  if (preview) {
    window.createAndMountApp = createAndMountApp;
  } else {
    createAndMountApp("#dodobird-chatbot-root");
  }
}

// Initialize the app
initializeApp();

