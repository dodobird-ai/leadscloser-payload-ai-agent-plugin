<template lang="pug">
.floating-bubbles(
  v-if="!statusActive && floatingQuestions.length > 0 && shouldShowBubbles"
  :class="{ 'floating-bubbles--hidden': isScrolling, 'floating-bubbles--mobile': statusSmallScreen }"
  :style="{ '--primary-color': botParameters?.primaryColor || '#4A90E2' }"
)
  .floating-bubbles__close-btn(@click="handleClose" title="Close suggestions")
    | ✕
  .floating-bubbles__scroll
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
      nudgeInterval: null,
    };
  },
  computed: {
    ...mapState(useBotStore, [
      "statusActive",
      "statusSmallScreen",
      "botParameters",
      "dynamicForms",
      "messagesDataForCurrentConversation",
      "floatingBubblesDismissed",
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

    // Show all bubbles on both mobile and desktop
    displayedQuestions() {
      return this.floatingQuestions;
    },

    // Show bubbles unless user dismissed them
    shouldShowBubbles() {
      return !this.floatingBubblesDismissed;
    },

    locale() {
      return this.dynamicForms.localeForm.data
        ? this.dynamicForms.localeForm.data.language
        : this.$root.$i18n.locale;
    },
  },
  mounted() {
    // Listen for scroll to hide bubbles temporarily
    window.addEventListener('scroll', this.handleScroll, { passive: true });

    // Nudge the carousel to hint there are more pills (if scrollable)
    this.$nextTick(() => {
      setTimeout(() => this.startNudgeLoop(), 800);
    });
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
    this.stopNudgeLoop();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
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
      this.$emit("bubble-click", text);
    },

    startNudgeLoop() {
      this.nudgeScroll();
      this.nudgeInterval = setInterval(() => this.nudgeScroll(), 3000);
    },

    stopNudgeLoop() {
      if (this.nudgeInterval) {
        clearInterval(this.nudgeInterval);
        this.nudgeInterval = null;
      }
    },

    nudgeScroll() {
      const scrollEl = this.$el?.querySelector('.floating-bubbles__scroll');
      if (!scrollEl) return;
      // Only nudge if the container is actually horizontally scrollable
      if (scrollEl.scrollWidth <= scrollEl.clientWidth) return;
      // If user has manually scrolled, stop nudging
      if (scrollEl.scrollLeft > 5) {
        this.stopNudgeLoop();
        return;
      }
      // Temporarily disable scroll-snap so it doesn't fight the nudge
      scrollEl.style.scrollSnapType = 'none';
      scrollEl.scrollTo({ left: 60, behavior: 'smooth' });
      setTimeout(() => {
        scrollEl.scrollTo({ left: 0, behavior: 'smooth' });
        // Re-enable snap after scrolling back
        setTimeout(() => {
          scrollEl.style.scrollSnapType = '';
        }, 400);
      }, 600);
    },

    handleClose() {
      const store = useBotStore();
      store.setFloatingBubblesDismissed(true);
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
  align-items: flex-end;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;

  // Mobile layout - horizontal scrollable carousel
  &--mobile {
    left: 16px;
    right: 16px;
    transform: none;
    bottom: 95px !important; // Position above the "Ask Max AI..." button with spacing
    max-width: 600px;
    margin: 0 auto;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;

    .floating-bubbles__close-btn {
      position: static;
      margin-bottom: 0;
      width: 24px;
      height: 24px;
      font-size: 12px;
      z-index: 1;
    }

    .floating-bubbles__scroll {
      display: flex;
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      flex-wrap: nowrap;
      gap: 8px;
      align-items: stretch;
      padding-right: 0; // let last pill peek past edge
      scroll-snap-type: x mandatory;
      scrollbar-width: none; // hide scrollbar Firefox
      width: 100%;
      pointer-events: auto; // re-enable touch/scroll on the carousel
      &::-webkit-scrollbar { display: none; } // hide scrollbar Webkit
    }

    .floating-bubble__arrow {
      display: none;
    }
  }

  // Hidden state when scrolling
  &--hidden {
    opacity: 0;
    transform: translateY(20px);
  }

  &__scroll {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-end;
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

    // Carousel pill sizing: show 2 full + peek of 3rd
    flex: 0 0 auto;
    width: calc((100vw - 32px - 16px) / 2.3); // ~145px on 375px, shows ~30% of 3rd pill
    animation: none; // disable float animation in row
    scroll-snap-align: start;

    &__text {
      font-size: 13px;
      line-height: 1.3;
      margin-right: 4px;
      color: #ffffff; // White text for better visibility on colored background
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
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
