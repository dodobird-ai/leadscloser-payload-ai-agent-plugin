<template lang="pug">
.property-preview-overlay(@click="handleOverlayClick")
  .property-preview-modal(ref="modalRef" @click.stop @scroll="handleModalScroll")
    //- Combined header with drag handle and close button
    .modal-header(:class="{ 'header-hidden': isHeaderHidden }")
      .drag-indicator
      .property-preview-close(@click.stop="closePreview")
        ElIcon
          CloseIcon
    .property-preview-content
      //- Hero Image Section with Carousel
      .property-hero(
        @touchstart="handleCarouselTouchStart"
        @touchmove="handleCarouselTouchMove"
        @touchend="handleCarouselTouchEnd"
        @click="handleCarouselTap"
      )
        .property-hero-carousel
          .carousel-image(
            v-for="(url, index) in imageUrls"
            :key="index"
            :class="{ active: currentImageIndex === index }"
            :style="{ backgroundImage: 'url(' + url + ')' }"
          )

          //- Image indicators (only show if multiple images)
          .carousel-indicators(v-if="imageUrls.length > 1")
            .indicator(
              v-for="(_, index) in imageUrls"
              :key="'ind-' + index"
              :class="{ active: currentImageIndex === index }"
              @click.stop="currentImageIndex = index"
            )

          //- Enlarge button (bottom right)
          .enlarge-btn(@click.stop="openFullscreenImage(currentImageIndex)")
            ElIcon
              IconExpand

      //- Property Details Section
      .property-details-section
        //- Header
        .property-header
          h2.property-name {{ property.name }}
          .property-price-display(v-if="property.price")
            span.price-amount {{ property.currency }} {{ formatPrice(property.price) }}
            p.price-note *{{ $t("text.publicPrice") }}
          .property-meta
            span.property-sku(v-if="property.sku") {{ property.sku }}
            span.property-category(v-if="property.category") {{ property.category }}

        //- Specifications
        .property-specs(v-if="hasSpecifications")
          .spec-item(v-if="specifications.bedrooms")
            ElIcon
              IconBed
            span {{ specifications.bedrooms }} {{ $t("text.bedrooms") }}
          .spec-item(v-if="specifications.bathrooms")
            ElIcon
              IconBathroom
            span {{ specifications.bathrooms }} {{ $t("text.bathrooms") }}
          .spec-item(v-if="specifications.toilets")
            ElIcon
              IconToilet
            span {{ specifications.toilets }} {{ $t("text.toilets") }}
          .spec-item(v-if="specifications.size_in_sqmt")
            ElIcon
              IconExpand
            span {{ specifications.size_in_sqmt }} m²
          .spec-item(v-if="specifications.lot_size")
            ElIcon
              IconLocation
            span {{ specifications.lot_size }} m² {{ $t("text.lot") }}
          .spec-item(v-if="specifications.terrace_size")
            ElIcon
              IconTerrace
            span {{ specifications.terrace_size }} m² {{ $t("text.terrace") }}
          .spec-item(v-if="specifications.parking_spaces")
            ElIcon
              IconParking
            span {{ specifications.parking_spaces }} {{ $t("text.parkingSpaces") }}
          .spec-item(v-if="specifications.year_built")
            ElIcon
              IconCalendar
            span {{ $t("text.built") }} {{ specifications.year_built }}

        //- Description (moved above features and address)
        .property-description
          h3 {{ $t("text.description") }}
          .description-content(v-html="property.description")

        //- Address (simplified to city + region only)
        .property-address(v-if="hasAddress")
          ElIcon
            IconLocation
          .address-details
            p {{ addressDisplay }}

        //- Features & Amenities
        .property-features(v-if="hasFeatures")
          h3 {{ $t("text.featuresAmenities") }}
          .features-grid
            .feature-tag(v-for="(_, key) in displayFeatures" :key="key")
              ElIcon
                CircleCheckIcon
              span {{ formatFeatureName(key) }}

      //- Actions Section
      .property-actions
        //- Property Actions (PDF, Contact Agent, Cart, etc.)
        .main-actions(v-if="property.actions && Object.keys(property.actions).length > 0")
          ElButton.action-btn.action-btn--primary(
            v-for="actionKey in Object.keys(property.actions)"
            :key="actionKey"
            :color="botParameters.primaryColor"
            @click="handleAction(actionKey, property.actions[actionKey])"
            :disabled="botParameters.preview"
          )
            ElIcon(v-if="property.actions[actionKey].frontend_params.icon === 'pdf'")
              DocumentIcon
            ElIcon(v-else-if="property.actions[actionKey].frontend_params.icon === 'contact'")
              ContactIcon
            ElIcon(v-else-if="property.actions[actionKey].frontend_params.icon === 'cart'")
              CartIcon
            | &nbsp;{{ property.actions[actionKey].frontend_params.text }}

        //- Visit Detailed Page (at the end)
        ElButton.action-btn.action-btn--secondary(
          @click="visitDetailedPage"
          :style="{ borderColor: botParameters.primaryColor, color: botParameters.primaryColor }"
        )
          ElIcon
            ViewIcon
          | &nbsp;{{ $t("btn.viewDetailedPage") }}

//- Fullscreen Image Viewer with Zoom (Teleported to body)
Teleport(to="body")
  .fullscreen-image-viewer(v-if="isFullscreenOpen" @click="closeFullscreen")
    .fullscreen-close(@click.stop="closeFullscreen")
      ElIcon
        CloseIcon

    //- Image and controls wrapper
    .fullscreen-image-wrapper(@click.stop)
      .fullscreen-carousel-container(
        ref="imageContainer"
        @wheel.prevent="handleZoomWheel"
        @touchstart="handleFullscreenTouchStart"
        @touchmove="handleFullscreenTouchMove"
        @touchend="handleFullscreenTouchEnd"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      )
        .fullscreen-carousel-track(:style="carouselTrackStyle")
          .fullscreen-slide(
            v-for="(url, index) in imageUrls"
            :key="index"
          )
            img.fullscreen-image(
              :src="url"
              :style="index === fullscreenImageIndex ? fullscreenImageStyle : {}"
              @load="onFullscreenImageLoad"
              draggable="false"
            )

      //- Controls bar right under the image (only show if multiple images)
      .fullscreen-controls-bar(v-if="imageUrls.length > 1")
        //- Previous button
        .control-btn.nav-btn(@click="fullscreenPrevious")
          ElIcon
            ArrowLeftIcon

        //- Image counter
        .image-counter
          | {{ fullscreenImageIndex + 1 }} / {{ imageUrls.length }}

        //- Next button
        .control-btn.nav-btn(@click="fullscreenNext")
          ElIcon
            ArrowRightIcon
</template>

<script>
import { ElButton, ElIcon } from "element-plus";
import { mapState } from "pinia";
import { useBotStore } from "@/store/bot";
import {
  Close as CloseIcon,
  View as ViewIcon,
  Document as DocumentIcon,
  ChatDotRound as ContactIcon,
  ShoppingCart as CartIcon,
  Message as IconMessage,
  Phone as IconPhone,
  User as IconUser,
  Location as IconLocation,
  House as IconBed,
  FullScreen as IconExpand,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  CircleCheck as CircleCheckIcon,
  ToiletPaper as IconToilet,
  Calendar as IconCalendar,
  Grid as IconTerrace,
  Van as IconParking,
} from "@element-plus/icons-vue";
// Note: Using available Element Plus icons as substitutes
// IconBathroom will use a similar icon
import { House as IconBathroom } from "@element-plus/icons-vue";

export default {
  name: "PropertyPreview",
  components: {
    ElButton,
    ElIcon,
    CloseIcon,
    ViewIcon,
    DocumentIcon,
    ContactIcon,
    CartIcon,
    IconMessage,
    IconPhone,
    IconUser,
    IconLocation,
    IconBed,
    IconBathroom,
    IconToilet,
    IconExpand,
    IconTerrace,
    IconParking,
    IconCalendar,
    ArrowLeftIcon,
    ArrowRightIcon,
    CircleCheckIcon,
  },

  data() {
    return {
      currentImageIndex: 0,
      // Header visibility on scroll
      isHeaderHidden: false,
      lastScrollTop: 0,
      // Fullscreen image viewer state
      isFullscreenOpen: false,
      fullscreenImageIndex: 0,
      zoomLevel: 1,
      minZoom: 0.5,
      maxZoom: 4,
      // Pan/drag state
      translateX: 0,
      translateY: 0,
      isDragging: false,
      lastTouchX: 0,
      lastTouchY: 0,
      // Pinch zoom state
      initialPinchDistance: 0,
      initialZoom: 1,
      pinchCenterX: 0,
      pinchCenterY: 0,
      // Swipe state for fullscreen
      swipeStartX: 0,
      swipeStartY: 0,
      swipeStartTime: 0,
      // Carousel swipe state
      carouselSwipeStartX: 0,
      carouselSwipeStartY: 0,
      carouselSwipeStartTime: 0,
      carouselDidSwipe: false,
      // Fullscreen carousel swipe offset (for live dragging effect)
      fullscreenSwipeOffset: 0,
      isFullscreenSwiping: false,
      // Track if we're closing to prevent double-close
      isClosing: false,
    };
  },

  mounted() {
    // Push history state so back button closes modal instead of navigating away
    window.history.pushState({ propertyPreview: true }, '');
    window.addEventListener('popstate', this.handlePopState);
  },

  beforeUnmount() {
    // Remove popstate listener
    window.removeEventListener('popstate', this.handlePopState);
    // Restore body scroll if fullscreen was open
    if (this.isFullscreenOpen) {
      document.body.style.overflow = '';
    }
  },

  props: {
    property: {
      type: Object,
      required: true,
    },
  },

  computed: {
    ...mapState(useBotStore, ["botParameters"]),

    imageUrls() {
      if (!this.property.image_url) return [];
      // Split by comma and trim whitespace
      return this.property.image_url.split(',').map(url => url.trim()).filter(url => url);
    },

    specifications() {
      return this.property.description_metadata?.sources?.wp_crm?.specifications || {};
    },

    hasSpecifications() {
      const specs = this.specifications;
      return specs.bedrooms || specs.bathrooms || specs.toilets ||
             specs.size_in_sqmt || specs.lot_size || specs.terrace_size ||
             specs.parking_spaces || specs.year_built;
    },

    address() {
      return this.property.description_metadata?.sources?.wp_crm?.address || {};
    },

    addressDisplay() {
      const addr = this.address;
      const parts = [];

      if (addr.address_city) {
        parts.push(addr.address_city);
      }

      if (addr.address_region) {
        parts.push(addr.address_region);
      }

      return parts.join(', ');
    },

    hasAddress() {
      return this.addressDisplay.length > 0;
    },

    features() {
      return this.property.description_metadata?.sources?.wp_crm?.features || {};
    },

    displayFeatures() {
      // Filter out features that are just 1 or 0, and system fields
      const filtered = {};
      const excludeKeys = ['listing_type', 'property_type_name'];

      for (const [key, value] of Object.entries(this.features)) {
        if (excludeKeys.includes(key)) continue;
        if (value === 1 || value === true || (typeof value === 'string' && value.length > 0)) {
          filtered[key] = value;
        }
      }
      return filtered;
    },

    hasFeatures() {
      return Object.keys(this.displayFeatures).length > 0;
    },

    fullscreenImageStyle() {
      return {
        transform: `translate(${this.translateX}px, ${this.translateY}px) scale(${this.zoomLevel})`,
        transition: this.isDragging ? 'none' : 'transform 0.25s ease-out',
      };
    },

    carouselTrackStyle() {
      const baseOffset = -this.fullscreenImageIndex * 100;
      const swipePercent = (this.fullscreenSwipeOffset / window.innerWidth) * 100;
      return {
        transform: `translateX(calc(${baseOffset}% + ${swipePercent}%))`,
        transition: this.isFullscreenSwiping ? 'none' : 'transform 0.3s ease-out',
      };
    },
  },

  methods: {
    getFirstImageUrl(imageUrl) {
      if (!imageUrl) return "";
      return imageUrl.split(",")[0].trim();
    },

    formatPrice(price) {
      if (!price) return "";
      const formattedPrice = price.toFixed(2);
      return parseFloat(formattedPrice).toLocaleString();
    },

    closePreview(fromBackButton = false) {
      if (this.isClosing) return;
      this.isClosing = true;

      // Remove listener first to prevent double-trigger
      window.removeEventListener('popstate', this.handlePopState);

      // If not closed via back button, go back in history to clean up the state we pushed
      if (!fromBackButton) {
        window.history.back();
      }
      this.$emit("close");
    },

    handlePopState() {
      // Back button was pressed, close the modal
      this.closePreview(true);
    },

    handleOverlayClick() {
      this.closePreview();
    },

    handleModalScroll(e) {
      const scrollTop = e.target.scrollTop;
      const scrollDelta = scrollTop - this.lastScrollTop;

      // Only hide/show after scrolling a minimum amount (10px) to avoid jitter
      if (Math.abs(scrollDelta) > 10) {
        // Scrolling down - hide header
        if (scrollDelta > 0 && scrollTop > 50) {
          this.isHeaderHidden = true;
        }
        // Scrolling up - show header
        else if (scrollDelta < 0) {
          this.isHeaderHidden = false;
        }
        this.lastScrollTop = scrollTop;
      }

      // Always show header when at the top
      if (scrollTop <= 10) {
        this.isHeaderHidden = false;
        this.lastScrollTop = 0;
      }
    },

    visitDetailedPage() {
      if (this.property.item_url) {
        window.open(this.property.item_url, "_blank");
      }
    },

    handleAction(actionKey, actionObjValues) {
      this.$emit("handle-action", { key: actionKey, actionObjValues });
    },

    nextImage() {
      if (this.imageUrls.length === 0) return;
      this.currentImageIndex = (this.currentImageIndex + 1) % this.imageUrls.length;
    },

    previousImage() {
      if (this.imageUrls.length === 0) return;
      this.currentImageIndex = (this.currentImageIndex - 1 + this.imageUrls.length) % this.imageUrls.length;
    },

    // Carousel swipe handlers
    handleCarouselTouchStart(e) {
      if (e.touches.length === 1) {
        this.carouselSwipeStartX = e.touches[0].clientX;
        this.carouselSwipeStartY = e.touches[0].clientY;
        this.carouselSwipeStartTime = Date.now();
        this.carouselDidSwipe = false;
      }
    },

    handleCarouselTouchMove(e) {
      if (this.carouselSwipeStartX === 0) return;

      const deltaX = Math.abs(e.touches[0].clientX - this.carouselSwipeStartX);
      const deltaY = Math.abs(e.touches[0].clientY - this.carouselSwipeStartY);

      // If horizontal movement is greater, prevent vertical scroll and mark as swipe
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
        this.carouselDidSwipe = true;
      }
    },

    handleCarouselTouchEnd(e) {
      if (this.carouselSwipeStartX === 0) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - this.carouselSwipeStartX;
      const deltaY = Math.abs(touch.clientY - this.carouselSwipeStartY);
      const deltaTime = Date.now() - this.carouselSwipeStartTime;

      // Check if it was a horizontal swipe
      const isHorizontalSwipe = Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 50;
      const isFastSwipe = deltaTime < 300;
      const isLongSwipe = Math.abs(deltaX) > 80;

      if (isHorizontalSwipe && (isFastSwipe || isLongSwipe) && this.imageUrls.length > 1) {
        this.carouselDidSwipe = true;
        if (deltaX > 0) {
          this.previousImage();
        } else {
          this.nextImage();
        }
      }

      // Reset
      this.carouselSwipeStartX = 0;
      this.carouselSwipeStartY = 0;
      this.carouselSwipeStartTime = 0;
    },

    handleCarouselTap(e) {
      // Only open fullscreen if it wasn't a swipe and didn't tap on indicators or enlarge button
      if (this.carouselDidSwipe) {
        this.carouselDidSwipe = false;
        return;
      }

      // Check if tap was on indicators or enlarge button
      const target = e.target;
      if (target.closest('.carousel-indicators') || target.closest('.enlarge-btn')) {
        return;
      }

      this.openFullscreenImage(this.currentImageIndex);
    },

    formatFeatureName(key) {
      // Convert snake_case or camelCase to Title Case
      return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/^\s+/, '') // Remove leading spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    },

    // Fullscreen image viewer methods
    openFullscreenImage(index) {
      this.fullscreenImageIndex = index;
      this.zoomLevel = 1;
      this.isFullscreenOpen = true;
      // Prevent body scroll when fullscreen is open
      document.body.style.overflow = 'hidden';
    },

    closeFullscreen() {
      this.isFullscreenOpen = false;
      this.zoomLevel = 1;
      this.translateX = 0;
      this.translateY = 0;
      // Restore body scroll
      document.body.style.overflow = '';
    },

    onFullscreenImageLoad() {
      // Image loaded, could add loading state here if needed
    },

    zoomIn() {
      this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + 0.25);
    },

    zoomOut() {
      this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - 0.25);
    },

    resetZoom() {
      this.zoomLevel = 1;
      this.translateX = 0;
      this.translateY = 0;
    },

    constrainPanBounds() {
      // Calculate the maximum allowed pan based on zoom level
      // When zoomed, allow panning up to (zoomLevel - 1) * half the viewport size
      const maxPanX = (this.zoomLevel - 1) * window.innerWidth * 0.4;
      const maxPanY = (this.zoomLevel - 1) * window.innerHeight * 0.35;

      // Smoothly constrain to bounds
      if (Math.abs(this.translateX) > maxPanX) {
        this.translateX = this.translateX > 0 ? maxPanX : -maxPanX;
      }
      if (Math.abs(this.translateY) > maxPanY) {
        this.translateY = this.translateY > 0 ? maxPanY : -maxPanY;
      }
    },

    handleZoomWheel(e) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = this.zoomLevel + delta;
      this.zoomLevel = Math.min(this.maxZoom, Math.max(this.minZoom, newZoom));

      // If zoomed out to 1 or less, reset translate
      if (this.zoomLevel <= 1) {
        this.translateX = 0;
        this.translateY = 0;
      }
    },

    // Mouse drag handlers for desktop panning
    handleMouseDown(e) {
      if (this.zoomLevel > 1) {
        e.preventDefault();
        this.isDragging = true;
        this.lastTouchX = e.clientX;
        this.lastTouchY = e.clientY;
      }
    },

    handleMouseMove(e) {
      if (this.isDragging && this.zoomLevel > 1) {
        e.preventDefault();
        const deltaX = e.clientX - this.lastTouchX;
        const deltaY = e.clientY - this.lastTouchY;

        this.translateX += deltaX;
        this.translateY += deltaY;

        this.lastTouchX = e.clientX;
        this.lastTouchY = e.clientY;
      }
    },

    handleMouseUp() {
      if (this.isDragging && this.zoomLevel > 1) {
        this.constrainPanBounds();
      }
      this.isDragging = false;
    },

    // Touch handlers for fullscreen - supports both pinch zoom and horizontal swipe
    getTouchDistance(touches) {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    },

    handleFullscreenTouchStart(e) {
      if (e.touches.length === 2) {
        // Two finger gesture - pinch zoom + pan
        this.initialPinchDistance = this.getTouchDistance(e.touches);
        this.initialZoom = this.zoomLevel;
        // Store the center point of the two fingers for panning
        this.pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        this.pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        this.lastTouchX = this.pinchCenterX;
        this.lastTouchY = this.pinchCenterY;
        this.isDragging = true;
        this.isFullscreenSwiping = false;
      } else if (e.touches.length === 1) {
        // Single touch - swipe for image navigation (only when not zoomed)
        this.swipeStartX = e.touches[0].clientX;
        this.swipeStartY = e.touches[0].clientY;
        this.swipeStartTime = Date.now();
        this.fullscreenSwipeOffset = 0;
        this.isFullscreenSwiping = false;
      }
    },

    handleFullscreenTouchMove(e) {
      if (e.touches.length === 2) {
        e.preventDefault();

        // Calculate current center of the two fingers
        const currentCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        // Pinch zoom
        if (this.initialPinchDistance > 0) {
          const currentDistance = this.getTouchDistance(e.touches);
          const scale = currentDistance / this.initialPinchDistance;
          const newZoom = this.initialZoom * scale;
          this.zoomLevel = Math.min(this.maxZoom, Math.max(this.minZoom, newZoom));
        }

        // Two-finger pan (move the image by dragging with two fingers)
        const deltaX = currentCenterX - this.lastTouchX;
        const deltaY = currentCenterY - this.lastTouchY;

        this.translateX += deltaX;
        this.translateY += deltaY;

        this.lastTouchX = currentCenterX;
        this.lastTouchY = currentCenterY;
        this.isDragging = true;
      } else if (e.touches.length === 1 && this.zoomLevel <= 1 && this.swipeStartX !== 0) {
        // Single finger swipe - show carousel effect (only when not zoomed)
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.swipeStartX;
        const deltaY = Math.abs(touch.clientY - this.swipeStartY);

        // Only start carousel swiping if horizontal movement is dominant
        if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
          e.preventDefault();
          this.isFullscreenSwiping = true;

          // Add resistance at edges (first and last image)
          let offset = deltaX;
          if (this.fullscreenImageIndex === 0 && deltaX > 0) {
            // First image, swiping right - add resistance
            offset = deltaX * 0.3;
          } else if (this.fullscreenImageIndex === this.imageUrls.length - 1 && deltaX < 0) {
            // Last image, swiping left - add resistance
            offset = deltaX * 0.3;
          }

          this.fullscreenSwipeOffset = offset;
        }
      }
    },

    handleFullscreenTouchEnd() {
      this.isDragging = false;

      if (this.initialPinchDistance > 0) {
        // End of pinch zoom / two-finger pan - reset to 100%
        this.initialPinchDistance = 0;
        this.zoomLevel = 1;
        this.translateX = 0;
        this.translateY = 0;
        return;
      }

      // Handle carousel swipe end
      if (this.isFullscreenSwiping && this.zoomLevel <= 1) {
        const threshold = window.innerWidth * 0.2; // 20% of screen width

        if (this.fullscreenSwipeOffset < -threshold && this.fullscreenImageIndex < this.imageUrls.length - 1) {
          // Swiped left enough - go to next image
          this.fullscreenImageIndex++;
          this.translateX = 0;
          this.translateY = 0;
        } else if (this.fullscreenSwipeOffset > threshold && this.fullscreenImageIndex > 0) {
          // Swiped right enough - go to previous image
          this.fullscreenImageIndex--;
          this.translateX = 0;
          this.translateY = 0;
        }

        // Reset swipe offset with animation
        this.isFullscreenSwiping = false;
        this.fullscreenSwipeOffset = 0;
      }

      // Reset swipe state
      this.swipeStartX = 0;
      this.swipeStartY = 0;
      this.swipeStartTime = 0;
    },

    fullscreenNext() {
      if (this.imageUrls.length === 0) return;
      this.fullscreenImageIndex = (this.fullscreenImageIndex + 1) % this.imageUrls.length;
      this.zoomLevel = 1; // Reset zoom when changing images
      this.translateX = 0;
      this.translateY = 0;
    },

    fullscreenPrevious() {
      if (this.imageUrls.length === 0) return;
      this.fullscreenImageIndex = (this.fullscreenImageIndex - 1 + this.imageUrls.length) % this.imageUrls.length;
      this.zoomLevel = 1; // Reset zoom when changing images
      this.translateX = 0;
      this.translateY = 0;
    },
  },
};
</script>

<style lang="scss" scoped>
.property-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh; // Dynamic viewport height - accounts for iOS Safari UI
  // Safari fix: use width/height instead of right/bottom
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px); // Safari support
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  animation: fadeIn 0.3s ease;
  // Safari safe area support
  padding-top: max(20px, env(safe-area-inset-top));
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  padding-left: max(20px, env(safe-area-inset-left));
  padding-right: max(20px, env(safe-area-inset-right));
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.property-preview-modal {
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// Combined modal header with drag indicator and close button
.modal-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 16px 12px;
  background: white;
  border-radius: 12px 12px 0 0;
  min-height: 48px;
  transition: transform 0.3s ease, opacity 0.3s ease;

  &.header-hidden {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }

  .drag-indicator {
    width: 40px;
    height: 5px;
    background: #d0d0d0;
    border-radius: 3px;
  }
}

.property-preview-close {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #e5e5e5;
  }

  .el-icon {
    font-size: 20px;
    color: #333;
  }
}

.property-preview-content {
  display: flex;
  flex-direction: column;
}

// Hero Image Carousel Section
.property-hero {
  position: relative;
  height: 400px;
  overflow: hidden;
}

.property-hero-carousel {
  position: relative;
  width: 100%;
  height: 100%;
}

.carousel-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;

  &.active {
    opacity: 1;
  }
}

// Enlarge button (bottom right)
.enlarge-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 3;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.1);
  }

  .el-icon {
    font-size: 18px;
    color: white;
  }
}

.carousel-indicators {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;

  &.active {
    background: white;
    width: 24px;
    border-radius: 4px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.8);
  }
}

// Details Section
.property-details-section {
  padding: 30px;
}

.property-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e5e5;

  h2 {
    font-size: 32px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 16px 0;
    line-height: 1.2;
  }
}

.property-price-display {
  margin-bottom: 16px;

  .price-amount {
    font-size: 28px;
    font-weight: 700;
    color: #1a1a1a;
    display: block;
    line-height: 1.2;
  }

  .price-note {
    font-size: 12px;
    color: #888;
    margin: 4px 0 0 0;
  }
}

.property-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  span {
    padding: 6px 14px;
    background: #f5f5f5;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    color: #666;
    text-transform: capitalize;
  }
}

.property-specs {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;

  .spec-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    color: #333;

    .el-icon {
      font-size: 20px;
      color: #666;
    }

    span {
      font-weight: 500;
    }
  }
}

.property-address {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;

  .el-icon {
    font-size: 20px;
    color: #666;
    margin-top: 2px;
  }

  .address-details {
    p {
      margin: 0;
      font-size: 14px;
      color: #555;
      line-height: 1.6;
    }
  }
}

.property-features {
  margin-bottom: 30px;

  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 16px 0;
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.feature-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f9f9f9;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f0f0;
  }

  .el-icon {
    font-size: 16px;
    color: #4caf50;
    flex-shrink: 0;
  }

  span {
    font-weight: 500;
  }
}

.property-description {
  margin-bottom: 30px;

  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 16px 0;
  }

  .description-content {
    font-size: 15px;
    line-height: 1.8;
    color: #555;

    :deep(p) {
      margin-bottom: 12px;
    }
  }
}

// Actions Section
.property-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 30px 30px 30px;

  .main-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .action-btn {
    width: 100% !important;
    max-width: 100% !important;
    height: 52px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    display: block !important;
    border: none;
    border-radius: 2px !important;
    transition: all 0.25s ease;
    margin-left: 0 !important;
    margin-right: 0 !important;

    :deep(span) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }

    // Override Element Plus default button spacing
    & + & {
      margin-left: 0 !important;
    }

    .el-icon {
      font-size: 16px;
    }

    &--primary {
      box-shadow: none;

      &:hover {
        opacity: 0.9;
      }
    }

    &--secondary {
      background: transparent !important;
      border: 1px solid !important;
      margin-top: 8px;

      &:hover {
        background: rgba(0, 0, 0, 0.03) !important;
      }
    }

    &:active {
      opacity: 0.8;
    }
  }
}

// Responsive Design
@media (max-width: 768px) {
  .property-preview-overlay {
    padding: 0;
    padding-top: max(8px, env(safe-area-inset-top, 8px));
    align-items: flex-end;
  }

  .property-preview-modal {
    // Use dvh for iOS Safari compatibility (fallback to vh for older browsers)
    max-height: calc(100vh - 8px);
    max-height: calc(100dvh - max(8px, env(safe-area-inset-top, 8px)));
    border-radius: 16px 16px 0 0;
    animation: slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUpMobile {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    padding: 14px 12px 10px;
    min-height: 44px;
    border-radius: 0;
  }

  .property-preview-close {
    width: 34px;
    height: 34px;
    right: 12px;

    .el-icon {
      font-size: 18px;
    }
  }

  .property-hero {
    height: 250px;
  }

  .enlarge-btn {
    bottom: 12px;
    right: 12px;
    width: 32px;
    height: 32px;

    .el-icon {
      font-size: 16px;
    }
  }

  .carousel-indicators {
    bottom: 12px;
  }

  .property-details-section {
    padding: 20px;
  }

  .property-header {
    margin-bottom: 20px;
    padding-bottom: 16px;

    h2 {
      font-size: 24px;
      margin-bottom: 12px;
    }
  }

  .property-price-display {
    margin-bottom: 12px;

    .price-amount {
      font-size: 22px;
    }

    .price-note {
      font-size: 11px;
    }
  }

  .property-meta {
    gap: 12px;

    span {
      padding: 5px 12px;
      font-size: 12px;
    }
  }

  .property-specs {
    flex-direction: column;
    gap: 12px;
    padding: 16px;

    .spec-item {
      font-size: 14px;

      .el-icon {
        font-size: 18px;
      }
    }
  }

  .property-address {
    padding: 14px;
    margin-bottom: 20px;

    .address-details p {
      font-size: 13px;
    }
  }

  .features-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }

  .feature-tag {
    padding: 8px 12px;
    font-size: 13px;

    .el-icon {
      font-size: 14px;
    }
  }

  .property-features {
    margin-bottom: 24px;

    h3 {
      font-size: 18px;
      margin-bottom: 12px;
    }
  }

  .property-description {
    margin-bottom: 24px;

    h3 {
      font-size: 18px;
      margin-bottom: 12px;
    }

    .description-content {
      font-size: 14px;
      line-height: 1.7;
    }
  }

  .property-actions {
    padding: 0 20px 20px 20px;
    gap: 10px;

    .action-btn {
      height: 46px;
      font-size: 14px;

      .el-icon {
        font-size: 16px;
      }
    }

    .additional-actions {
      gap: 8px;
      padding-top: 16px;
    }
  }
}

// Extra small devices
@media (max-width: 480px) {
  .property-preview-modal {
    max-height: calc(100vh - 8px);
    max-height: calc(100dvh - max(8px, env(safe-area-inset-top, 8px)));
  }

  .property-hero {
    height: 200px;
  }

  .property-details-section {
    padding: 16px;
  }

  .property-header h2 {
    font-size: 20px;
  }

  .property-actions {
    padding: 0 16px 16px 16px;
  }
}
</style>

<style lang="scss">
// Fullscreen Image Viewer (not scoped to work with Teleport)
.fullscreen-image-viewer {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: rgba(0, 0, 0, 0.95) !important;
  z-index: 2147483647 !important; // Maximum z-index value
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  animation: fullscreenFadeIn 0.3s ease;
  // Safari safe areas
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-right);
  padding-right: env(safe-area-inset-left);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
  touch-action: none; // Prevent default touch behaviors
}

@keyframes fullscreenFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fullscreen-close {
  position: absolute;
  top: max(20px, env(safe-area-inset-top, 20px));
  right: max(20px, env(safe-area-inset-right, 20px));
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
  }

  .el-icon {
    font-size: 24px;
    color: white;
  }
}

.image-counter {
  color: white;
  font-size: 14px;
  font-weight: 500;
  padding: 0 16px;
}

.fullscreen-image-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  max-width: 90vw;
  overflow: visible; // Allow content to overflow while zooming/panning
}

.fullscreen-carousel-container {
  width: 100%;
  overflow: visible; // Allow image to go beyond bounds while dragging
  cursor: grab;
  position: relative;
  z-index: 10; // Above control bar

  &:active {
    cursor: grabbing;
  }
}

.fullscreen-carousel-track {
  display: flex;
  width: 100%;
  will-change: transform;
}

.fullscreen-slide {
  flex: 0 0 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  border-radius: 4px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

// Controls bar right under the image
.fullscreen-controls-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 30px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: relative;
  z-index: 1; // Below carousel container
}

.control-btn {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  &.disabled {
    opacity: 0.3;
    pointer-events: none;
  }

  .el-icon {
    font-size: 24px;
    color: white;
  }
}


// Mobile adjustments for fullscreen viewer
@media (max-width: 768px) {
  .fullscreen-close {
    top: max(15px, env(safe-area-inset-top, 15px));
    right: max(15px, env(safe-area-inset-right, 15px));
    width: 40px;
    height: 40px;

    .el-icon {
      font-size: 20px;
    }
  }

  .fullscreen-image-wrapper {
    gap: 12px;
    max-width: 95vw;
  }

  .fullscreen-image {
    max-width: 100%;
    max-height: 65vh;
  }

  .fullscreen-controls-bar {
    gap: 10px;
    padding: 10px 14px;
  }

  .control-btn {
    width: 40px;
    height: 40px;

    .el-icon {
      font-size: 18px;
    }
  }

  .image-counter {
    font-size: 13px;
    padding: 0 12px;
  }
}
</style>
