<template>
  <div v-if="dynamicForms.show && formConfig" class="dynamic-form" :class="{ active: dynamicForms.show }">
    <div class="form-popup">
      <div v-if="formConfig?.quit" class="close-button-wrapper">
        <ElIcon :size="28" @click="minimizeForm" role="button" class="close-button">
          <Minus />
        </ElIcon>
      </div>

      <DynamicForm
        :form-name="currentForm"
        :use-store-actions="true"
        title-component="h3"
        title-class="p-0 m-0"
        subtitle-component="h6"
        subtitle-class="ps-2"
      />
    </div>
  </div>
</template>

<script>
import { useBotStore } from "@/store/bot";
import { mapState, mapActions } from "pinia";
import { ElIcon } from "element-plus";
import { Minus } from "@element-plus/icons-vue";
import DynamicForm from "./DynamicForm.vue";

export default {
  name: "PopupForm",
  components: {
    DynamicForm,
    ElIcon,
    Minus,
  },
  data() {
    return {
      formConfigLocal: null,
    };
  },
  computed: {
    ...mapState(useBotStore, ["dynamicForms"]),
    formConfig() {
      // Return local config if available (updated by watcher), else from store
      return this.formConfigLocal || this.dynamicForms[this.currentForm];
    },
    currentForm() {
      return this.dynamicForms.currentForm;
    },
  },
  watch: {
    // Watch for when backend forms are loaded
    'dynamicForms': {
      handler() {
        const storeConfig = this.dynamicForms[this.currentForm];
        if (storeConfig?.schema || storeConfig?.quit !== undefined) {
          this.formConfigLocal = storeConfig;
        }
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    ...mapActions(useBotStore, ["setDynamicForm"]),
    minimizeForm() {
      this.setDynamicForm({
        show: false,
      });
    },
  },
};
</script>

<style scoped lang="scss">
@import '@/assets/scss/variables';

.dynamic-form {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: $z-index-root;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
  border-radius: 0 0 8px 8px;
}

.dynamic-form.active {
  visibility: visible;
  pointer-events: auto;
}

.dynamic-form.active .form-popup {
  bottom: 0;
}

.form-popup {
  position: absolute;
  bottom: -50%;
  left: 0;
  z-index: $z-index-root + 2;
  border-radius: 8px;
  background-color: white;
  width: 100%;
  padding: 15px 25px 50px 25px;;
  transition: bottom 0.5s ease-in-out;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.close-button-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 5px;
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 10;
  padding: 5px 0;
}

.close-button {
  cursor: pointer;
  padding: 6px;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333 !important;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f5f5f5;

  :deep(svg) {
    fill: #333 !important;
  }
}

.close-button:hover {
  opacity: 0.7;
}

@media (max-width: 768px) {
  .dynamic-form {
    border-radius: 0;
  }

  .dynamic-form.active .form-popup {
    bottom: 15vh;
  }

  .form-popup {
    border-radius: 8px 8px 0 0;
    padding: 12px 20px 20px 20px;
  }

  .close-button-wrapper {
    position: sticky;
    top: 0;
    background-color: white;
    z-index: 10;
    padding: 8px 0;
    margin: -12px -20px 10px -20px;
    padding-left: 20px;
    padding-right: 20px;
    border-bottom: 1px solid #f0f0f0;
  }

  .close-button {
    background-color: white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 10px;
    min-width: 48px;
    min-height: 48px;
  }
}
</style>