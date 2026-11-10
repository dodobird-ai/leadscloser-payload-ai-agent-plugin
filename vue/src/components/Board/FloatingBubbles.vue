<template lang="pug">
.floating-bubbles(
  v-if="!statusActive && floatingQuestions.length > 0 && shouldShowBubbles"
  :class="{ 'floating-bubbles--hidden': isScrolling, 'floating-bubbles--mobile': statusSmallScreen }"
  :style="{ '--primary-color': botParameters?.primaryColor || '#4A90E2' }"
)
  .floating-bubbles__close-btn(@click="handleClose" title="Close suggestions")
    | ✕
  .floating-bubble(
    v-for="(question, index) in displayedQuestions"
    :key="typeof question === 'string' ? question : question.id"
    :class="`floating-bubble--${index}`"
    @click="handleBubbleClick(question)"
  )
    .floating-bubble__text {{ getQuestionText(question) }}
    .floating-bubble__arrow ↑
</template>

<script>
import { mapState } from "pinia";
import { useBotStore } from "@/store/bot";

export default {
  name: "FloatingBubblesComponent",
  props: {
    isMobileTyping: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isScrolling: false,
      scrollTimeout: null,
      dismissed: false,
      // Mobile auto-show
      mobileAutoShowTimer: null,
      mobileAutoHideTimer: null,
      mobileAutoShowing: false,
      mobileCurrentIndex: -1,
    };
  },
  computed: {
    ...mapState(useBotStore, [
      "statusActive",
      "statusSmallScreen",
      "botParameters",
      "dynamicForms",
      "messagesDataForCurrentConversation",
    ]),

    // Get backend suggestions from the last message
    backendSuggestions() {
      if (this.messagesDataForCurrentConversation.length === 0) return [];
      const lastMessage = this.messagesDataForCurrentConversation[this.messagesDataForCurrentConversation.length - 1];
      return lastMessage.suggestions || [];
    },

    // Return either backend suggestions (if available) or initial floating questions
    floatingQuestions() {
      // If we have backend suggestions from a conversation, show those instead of initial questions
      if (this.backendSuggestions.length > 0) {
        return this.backendSuggestions;
      }
      // Otherwise show initial floating questions
      return this.botParameters.floatingQuestions || [];
    },

    // Show 1 bubble on mobile (cycling sequentially), 3 when typing, all on desktop
    displayedQuestions() {
      if (this.statusSmallScreen) {
        if (this.mobileAutoShowing && !this.isMobileTyping) {
          const idx = this.mobileCurrentIndex % this.floatingQuestions.length;
          return [this.floatingQuestions[idx]];
        }
        return this.floatingQuestions.slice(0, 3);
      }
      return this.floatingQuestions;
    },

    // Show bubbles on desktop always, on mobile when auto-showing or typing
    shouldShowBubbles() {
      if (this.dismissed) {
        return false;
      }
      if (this.statusSmallScreen) {
        return this.mobileAutoShowing || this.isMobileTyping;
      }
      return true; // Always show on desktop
    },

    locale() {
      return this.dynamicForms.localeForm.data
        ? this.dynamicForms.localeForm.data.language
        : this.$root.$i18n.locale;
    },
  },
  watch: {
    statusActive(newValue) {
      if (newValue) {
        this.stopMobileAutoShow();
      } else if (this.statusSmallScreen && !this.dismissed) {
        this.startMobileAutoShow();
      }
    },
    statusSmallScreen(newValue) {
      if (newValue && !this.mobileAutoShowTimer && !this.dismissed) {
        window.addEventListener('scroll', this.handleScroll, { passive: true });
        this.startMobileAutoShow();
      }
    },
    floatingQuestions(newValue) {
      if (this.statusSmallScreen && newValue.length > 0 && !this.mobileAutoShowTimer && !this.dismissed) {
        this.startMobileAutoShow();
      }
    },
  },
  mounted() {
    if (this.statusSmallScreen) {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      this.$nextTick(() => {
        this.startMobileAutoShow();
      });
    }
  },
  beforeUnmount() {
    if (this.statusSmallScreen) {
      window.removeEventListener('scroll', this.handleScroll);
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      this.stopMobileAutoShow();
    }
  },
  methods: {
    handleScroll() {
      // Hide bubbles when scrolling
      this.isScrolling = true;

      // Clear existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      // Show bubbles again after user stops scrolling for 300ms
      this.scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
      }, 300);
    },

    getQuestionText(question) {
      // Handle both string suggestions (from backend) and object questions (initial)
      if (typeof question === 'string') {
        return question;
      } else if (question.text) {
        return question.text[this.locale];
      }
      return '';
    },

    handleBubbleClick(question) {
      const text = this.getQuestionText(question);
      this.stopMobileAutoShow();
      this.$emit("bubble-click", text);
    },

    handleClose() {
      this.dismissed = true;
      this.stopMobileAutoShow();
    },

    // Mobile auto-show: periodically show 1 bubble, cycling sequentially
    startMobileAutoShow() {
      if (this.dismissed || !this.floatingQuestions.length || this.statusActive) return;

      this.stopMobileAutoShow();

      this.mobileAutoShowTimer = setTimeout(() => {
        this.showNextBubble();
        this.scheduleMobileAutoShow();
      }, 10000);
    },

    scheduleMobileAutoShow() {
      if (this.dismissed || this.statusActive) return;

      this.mobileAutoShowTimer = setTimeout(() => {
        this.showNextBubble();
        this.scheduleMobileAutoShow();
      }, 10000);
    },

    showNextBubble() {
      if (this.dismissed || this.statusActive || this.isScrolling || !this.floatingQuestions.length) return;

      // Cycle sequentially: 0 → 1 → 2 → 0 → 1 → ...
      this.mobileCurrentIndex = (this.mobileCurrentIndex + 1) % this.floatingQuestions.length;
      this.mobileAutoShowing = true;

      this.mobileAutoHideTimer = setTimeout(() => {
        this.mobileAutoShowing = false;
      }, 10000);
    },

    stopMobileAutoShow() {
      if (this.mobileAutoShowTimer) {
        clearTimeout(this.mobileAutoShowTimer);
        this.mobileAutoShowTimer = null;
      }
      if (this.mobileAutoHideTimer) {
        clearTimeout(this.mobileAutoHideTimer);
        this.mobileAutoHideTimer = null;
      }
      this.mobileAutoShowing = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.floating-bubbles {
  position: fixed;
  bottom: 130px; // Position above the bot icon
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px; // Space between bubbles
  align-items: flex-end;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;

  // Mobile layout - centered above the input
  &--mobile {
    left: 16px;
    right: 16px;
    transform: none;
    bottom: 95px !important; // Position above the "Ask Max AI..." button with spacing
    align-items: center;
    max-width: 600px;
    margin: 0 auto;
  }

  // Hidden state when scrolling
  &--hidden {
    opacity: 0;
    transform: translateY(20px);
  }

  &__close-btn {
    pointer-events: auto;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    cursor: pointer;
    font-size: 16px;
    color: #666;
    transition: all 0.2s ease;
    margin-bottom: 8px;

    &:hover {
      background: #f5f5f5;
      color: #333;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.16);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

.floating-bubble {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;

  // Use bot message bubble styling
  background: #f0f0f0;
  border-radius: 10px;
  padding: 0.875rem 1.125rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  max-width: 280px;
  min-width: 200px;
  transition: all 0.3s ease;
  animation: float 3s ease-in-out infinite;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: #e8e8e8;
  }

  &__text {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
    font-weight: 500;
    color: #494949;
    text-align: left;
    margin-right: 0.75rem;
  }

  &__arrow {
    flex-shrink: 0;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  // Different animation delays for each bubble
  &--0 {
    animation-delay: 0s;
  }

  &--1 {
    animation-delay: 0.5s;
  }

  &--2 {
    animation-delay: 1s;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

// Mobile adjustments - lg breakpoint (991px)
@media (max-width: 991px) {
  .floating-bubbles {
    bottom: 140px;
  }

  .floating-bubble {
    max-width: 240px;
    min-width: 180px;
    width: auto;
    font-size: 13px;
    padding: 10px 16px;
    min-height: 44px;
    border-radius: 20px;

    // Use primaryColor for mobile background for better visibility
    background: var(--primary-color, #4A90E2);
    color: #ffffff; // White text for contrast against colored background

    &__text {
      font-size: 13px;
      line-height: 1.3;
      margin-right: 8px;
      color: #ffffff; // White text for better visibility on colored background
    }

    &__arrow {
      font-size: 14px;
      color: #ffffff; // White arrow for contrast
    }

    &:hover {
      filter: brightness(0.9); // Slightly darker on hover
      background: var(--primary-color, #4A90E2);
    }
  }
}

// Smaller mobile screens - md breakpoint (767px)
@media (max-width: 767px) {
  .floating-bubbles {
    bottom: 130px;
  }
}
</style>
