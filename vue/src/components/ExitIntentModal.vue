<template>
  <div v-if="show" class="exit-intent-form" :class="{ active: show }">
    <div class="exit-intent-popup">
      <div class="exit-intent-popup__header">
        <h3 class="exit-intent-popup__title">{{ $t('exitIntent.title') }}</h3>
      </div>

      <div class="exit-intent-popup__body">
        <p class="exit-intent-popup__message">{{ $t('exitIntent.message') }}</p>
      </div>

      <div class="exit-intent-popup__actions">
        <ElButton
          round
          plain
          @click="closeAnyway"
          class="exit-intent-popup__btn-secondary"
        >
          {{ $t('exitIntent.noButton') }}
        </ElButton>
        <ElButton
          round
          :color="botParameters.primaryColor"
          @click="openContactForm"
          class="exit-intent-popup__btn-primary"
        >
          {{ $t('exitIntent.yesButton') }}
        </ElButton>
      </div>
    </div>
  </div>
</template>

<script>
import { useBotStore } from "@/store/bot";
import { mapActions, mapState } from "pinia";
import { ElButton } from "element-plus";

export default {
  name: "ExitIntentModal",
  components: {
    ElButton,
  },
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapState(useBotStore, ["dynamicForms", "botParameters"]),
  },
  methods: {
    ...mapActions(useBotStore, [
      "setStatusActive",
      "toggleDynamicForm",
      "markExitIntentShown",
    ]),
    openContactForm() {
      this.markExitIntentShown();
      this.$emit("close-modal");
      this.toggleDynamicForm("contactForm");
    },
    closeAnyway() {
      this.markExitIntentShown();
      this.$emit("close-modal");
      this.$emit("confirm-close");
    },
  },
};
</script>

<style scoped lang="scss">
@import '@/assets/scss/variables';

// Overlay the entire bot window
.exit-intent-form {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: $z-index-root + 10;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.exit-intent-form.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.exit-intent-popup {
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: scale(0.9);
  transition: transform 0.3s ease-out;
  font-family: "Poppins", sans-serif;
}

.exit-intent-form.active .exit-intent-popup {
  transform: scale(1);
}

.exit-intent-popup__header {
  margin-bottom: 16px;
  text-align: center;
}

.exit-intent-popup__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: #333;
  font-family: "Poppins", sans-serif;
}

.exit-intent-popup__body {
  margin-bottom: 24px;
  text-align: center;
}

.exit-intent-popup__message {
  font-size: 1rem;
  line-height: 1.6;
  color: #666;
  margin: 0;
  font-family: "Poppins", sans-serif;
}

.exit-intent-popup__actions {
  display: flex;
  gap: 12px;
  flex-direction: column;
  width: 100%;
}

.exit-intent-popup__btn-primary,
.exit-intent-popup__btn-secondary {
  width: 100%;
  height: 44px;
  font-size: 1rem;
  font-weight: 500;
  font-family: "Poppins", sans-serif !important;
}

.exit-intent-popup__btn-secondary {
  border: 1px solid #ddd;
  color: #666;
}

@media (min-width: 768px) {
  .exit-intent-form {
    border-radius: 8px;
  }

  .exit-intent-popup__actions {
    flex-direction: row;
  }
}

@media (max-width: 768px) {
  .exit-intent-popup {
    padding: 24px;
  }
}
</style>
