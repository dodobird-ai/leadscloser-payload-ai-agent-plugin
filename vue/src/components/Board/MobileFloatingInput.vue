<template lang="pug">
.mobile-floating-input(
  v-if="statusSmallScreen && !statusActive"
  :class="{ 'mobile-floating-input--hidden': isScrolling }"
)
  .mobile-floating-input__wrapper(
    :class="{ 'mobile-floating-input__wrapper--expanded': isExpanded }"
    :style="{ '--button-bg': adaptiveButtonColor, '--button-text': adaptiveButtonTextColor, '--input-bg': buttonBackgroundColor }"
  )
    .mobile-floating-input__border(:style="borderGradientStyle")
    .mobile-floating-input__container(
      :class="{ 'mobile-floating-input__container--expanded': isExpanded }"
      @click="expand"
    )
      input.mobile-floating-input__field(
        v-model="inputText"
        type="text"
        :placeholder="placeholder"
        @keyup.enter="handleSubmit"
        @focus="handleFocus"
        @blur="handleBlur"
        ref="inputField"
      )
      button.mobile-floating-input__button(
        @click.stop="isExpanded ? handleSubmit() : expand()"
        :disabled="isExpanded && !inputText.trim()"
      )
        span.arrow ↑
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useBotStore } from "@/store/bot";

export default {
  name: "MobileFloatingInputComponent",
  data() {
    return {
      inputText: "",
      isExpanded: false,
      isScrolling: false,
      isTouching: false,
      scrollTimeout: null,
      detectedBackgroundColor: null,
      isLightBackground: true,
      mobileInitialized: false,
    };
  },
  computed: {
    ...mapState(useBotStore, ["statusActive", "statusSmallScreen", "botParameters", "messagesDataForCurrentConversation"]),

    hasExistingMessages() {
      return this.messagesDataForCurrentConversation && this.messagesDataForCurrentConversation.length > 0;
    },

    placeholder() {
      // If there are messages in the current conversation, show "Continue conversation"
      if (this.hasExistingMessages) {
        return this.$t("placeholder.continueConversation");
      }
      return this.$t("placeholder.askMaxAI");
    },

    buttonBackgroundColor() {
      return this.botParameters?.primaryColor || "#6b7280";
    },

    borderGradientStyle() {
      return {
        '--gradient': 'conic-gradient(from var(--angle), #6225a2, #ac1190, #da2578, #f5515f, #ff7f4d, transparent 60%, #6225a2)'
      };
    },

    adaptiveButtonColor() {
      // When collapsed, use high contrast based on detected background
      if (!this.isExpanded) {
        return this.isLightBackground ? (this.botParameters?.primaryColor || "#6b7280") : "white";
      }
      // When expanded, use primary color
      return this.botParameters?.primaryColor || "#6b7280";
    },

    adaptiveButtonTextColor() {
      // When collapsed, inverse of button color
      if (!this.isExpanded) {
        return this.isLightBackground ? "white" : (this.botParameters?.primaryColor || "#6b7280");
      }
      // When expanded, white text
      return "white";
    },

  },
  watch: {
    statusSmallScreen(newValue) {
      // When statusSmallScreen is set to true, initialize the mobile features
      if (newValue && !this.mobileInitialized) {
        this.mobileInitialized = true;
        this.initializeMobileFeatures();
      }
    },
  },
  mounted() {
    if (this.statusSmallScreen) {
      this.mobileInitialized = true;
      this.initializeMobileFeatures();
    }
  },
  beforeUnmount() {
    if (this.statusSmallScreen) {
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('touchstart', this.handleTouchStart);
      window.removeEventListener('touchend', this.handleTouchEnd);
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
    }
  },
  methods: {
    ...mapActions(useBotStore, ["setStatusActive"]),

    detectBackgroundColor() {
      try {
        // Get the wrapper element position
        const wrapper = this.$el.querySelector('.mobile-floating-input__wrapper');
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Temporarily hide the component to detect what's behind
        this.$el.style.visibility = 'hidden';

        // Get element at the button position
        const elementBehind = document.elementFromPoint(x, y);

        // Restore visibility
        this.$el.style.visibility = 'visible';

        if (elementBehind) {
          const bgColor = window.getComputedStyle(elementBehind).backgroundColor;
          this.detectedBackgroundColor = bgColor;

          // Calculate luminance to determine if background is light or dark
          const rgb = bgColor.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);

            // Calculate relative luminance
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            this.isLightBackground = luminance > 0.5;
          }
        }
      } catch (error) {
        console.error('Error detecting background color:', error);
      }
    },

    handleScroll() {
      // Hide immediately when scrolling
      this.isScrolling = true;

      // Clear existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      // Show again after user stops scrolling and finger is released
      this.scrollTimeout = setTimeout(() => {
        if (!this.isTouching) {
          this.isScrolling = false;
        }
      }, 300);
    },

    handleTouchStart() {
      // User is touching the screen
      this.isTouching = true;
      this.isScrolling = true;
    },

    handleTouchEnd() {
      // User released finger
      this.isTouching = false;

      // Show the input after a brief delay
      setTimeout(() => {
        if (!this.isTouching) {
          this.isScrolling = false;
        }
      }, 300);
    },

    expand() {
      // If there are existing messages, open the main chat instead
      if (this.hasExistingMessages) {
        this.setStatusActive(true);
        return;
      }

      // Otherwise, expand the input for new conversation
      if (!this.isExpanded) {
        this.isExpanded = true;
        this.$emit("typing", true);
        this.$nextTick(() => {
          this.$refs.inputField.focus();
        });
      }
    },

    handleSubmit() {
      if (!this.inputText.trim()) return;

      const text = this.inputText.trim();
      this.$emit("submit", text);
      this.inputText = "";
      this.isExpanded = false;
      this.$emit("typing", false); // Hide bubbles after submit
    },

    handleFocus() {
      // If there are existing messages, open the chat instead of expanding
      if (this.hasExistingMessages) {
        this.setStatusActive(true);
        return;
      }

      this.isExpanded = true;
      this.$emit("typing", true); // Show bubbles when input is focused
      this.$emit("focus");
    },

    handleBlur() {
      // Hide bubbles and collapse if no text
      setTimeout(() => {
        this.$emit("typing", false); // Hide bubbles when blurred
        if (!this.inputText.trim()) {
          this.isExpanded = false;
        }
      }, 200);
    },

    setInputText(text) {
      this.inputText = text;
    },

    initializeMobileFeatures() {
      this.$nextTick(() => {
        this.detectBackgroundColor();
      });
    },
  },
};
</script>

<style lang="scss" scoped>
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.mobile-floating-input {
  position: fixed;
  bottom: 40px;
  left: 0;
  right: 0;
  z-index: 1000;
  background: transparent;
  padding: 12px 16px 0;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;

  &--hidden {
    opacity: 0;
    transform: translateY(20px);
    pointer-events: none;
  }

  &__wrapper {
    position: relative;
    width: 240px;
    height: 44px;
    margin: 0 auto;
    pointer-events: auto;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 20px;

    &--expanded {
      width: calc(100% - 32px);
      max-width: 600px;

      &::before {
        content: '';
        position: absolute;
        inset: 2px;
        background: white;
        border-radius: 18px;
        z-index: 0;
      }
    }
  }

  &__border {
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 2px;
    background: var(--gradient, conic-gradient(
      from var(--angle),
      #6225a2,
      #ac1190,
      #da2578,
      #f5515f,
      #ff7f4d,
      transparent 60%,
      #6225a2
    ));
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    pointer-events: none;
    animation: rotate 4s linear infinite;

    &::after {
      content: '';
      position: absolute;
      inset: -1px;
      background: var(--gradient, conic-gradient(
        from var(--angle),
        #6225a2,
        #ac1190,
        #da2578,
        #f5515f,
        #ff7f4d,
        transparent 60%,
        #6225a2
      ));
      border-radius: inherit;
      filter: blur(16px) opacity(0.4);
      animation: rotate 4s linear infinite;
      z-index: -1;
    }
  }

  &__container {
    position: absolute;
    inset: 2px; // Leave space for gradient border
    z-index: 1;
    pointer-events: auto;
    display: flex;
    align-items: center;
    background: var(--input-bg, transparent); // Blue background when collapsed
    border-radius: 16px;
    padding: 6px 6px 6px 16px;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &--expanded {
      cursor: default;
      background: transparent; // Transparent when expanded (white shows from wrapper)
    }
  }

  &__field {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px; // 16px minimum to prevent iOS zoom
    background: transparent; // Always transparent - shows container color
    color: white; // White text when collapsed
    pointer-events: none;
    padding: 0;

    .mobile-floating-input__container--expanded & {
      pointer-events: auto;
      color: #333; // Dark text when expanded
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.9); // White placeholder when collapsed
    }

    .mobile-floating-input__container--expanded &::placeholder {
      color: #999; // Gray placeholder when expanded
    }
  }

  &__button {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--button-bg, white); // Adaptive color based on background
    color: var(--button-text, #6b7280); // Adaptive text color
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    margin: 0;

    &:disabled {
      background: #e5e7eb;
      cursor: not-allowed;

      .arrow {
        color: #9ca3af;
      }
    }

    &:not(:disabled):hover {
      filter: brightness(0.85);
      transform: scale(1.05);
    }

    &:not(:disabled):active {
      transform: scale(0.95);
    }

    .arrow {
      font-size: 20px;
      font-weight: bold;
      line-height: 1;
      display: block;
      margin-top: -2px; // Adjust for better vertical centering
    }
  }
}

@keyframes rotate {
  to {
    --angle: 360deg;
  }
}

// Only show on mobile/tablet
@media (min-width: 992px) {
  .mobile-floating-input {
    display: none;
  }
}
</style>
