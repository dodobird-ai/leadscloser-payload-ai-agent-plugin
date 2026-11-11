<template>
  <div v-if="formConfig && formConfig.schema">
    <div v-if="showTitle" class="form-header">
      <component :is="titleComponent" v-if="formConfig.title" :class="titleClass">
        {{ getLocalizedText(formConfig.title) }}
      </component>
      <component :is="subtitleComponent" v-if="formConfig.subTitle" :class="subtitleClass">
        {{ getLocalizedText(formConfig.subTitle) }}
      </component>
    </div>

    <Vueform :key="`${formName}:${locale}`" :locale="locale" ref="form$" addClass="vf-my-form" :schema="formSchema"
      :endpoint="false" :display-errors="false" validate-on="submit|blur" @submit="submit" />

    <div v-html="dynamicStyles"></div>
  </div>
</template>

<script>
import { useBotStore } from "@/store/bot";
import { mapState, mapActions } from "pinia";
import { nextTick } from "vue";
import { executeHooks, getFormHooks, hasHooks } from "@/hooks/formHooks";

export default {
  name: "DynamicForm",
  props: {
    formName: {
      type: String,
      required: true,
    },
    pendingAction: {
      type: Object,
      default: null,
    },
    actionText: {
      type: [String, Object],
      default: null,
    },
    showTitle: {
      type: Boolean,
      default: true,
    },
    titleComponent: {
      type: String,
      default: "h3",
    },
    titleClass: {
      type: String,
      default: "p-0 m-0",
    },
    subtitleComponent: {
      type: String,
      default: "h6",
    },
    subtitleClass: {
      type: String,
      default: "ps-2",
    },
    useStoreActions: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    formConfig: null,
    isSubmitting: false,
  }),
  mounted() {
    this.setFormConfig();
  },
  watch: {
    // Watch for when backend forms are loaded and update formConfig
    'dynamicForms': {
      handler() {
        if (!this.formConfig?.schema && this.dynamicForms[this.formName]?.schema) {
          this.setFormConfig();
        }
      },
      deep: true,
    },
  },
  computed: {
    ...mapState(useBotStore, [
      "dynamicForms",
      "botParameters",
      "actions",
      "geolocationNationality",
    ]),
    locale() {
      const locale = this.dynamicForms.localeForm.data
        ? this.dynamicForms.localeForm.data.language
        : this.botParameters.locale;

      // Ensure we return a valid locale string, default to 'en' if invalid
      return (typeof locale === 'string' && locale.length > 0) ? locale : 'en';
    },
    submitButtonText() {
      // If actionText prop is provided (inline forms), use it
      if (this.actionText) {
        if (typeof this.actionText === 'string') {
          return this.actionText;
        }
        return this.actionText[this.locale] || this.actionText.en || this.$t('btn.submit');
      }

      // If using store actions (popup forms), get from pending action
      if (this.useStoreActions && this.actions.pending.frontendParams && this.actions.pending.frontendParams.text) {
        const actionText = this.actions.pending.frontendParams.text;
        if (typeof actionText === 'string') {
          return actionText;
        }
        return actionText[this.locale] || actionText.en || 'Submit';
      }

      return this.$t('btn.submit');
    },
    formSchema() {
      if (!this.formConfig?.schema) return {};
      return {
        ...this.formConfig.schema,
        submit: {
          type: 'button',
          buttonLabel: this.submitButtonText,
          submits: true,
          align: 'center',
          size: 'sm',
          full: true,
          disabled: this.isSubmitting,
          bottom: 10,
        },
      };
    },
    dynamicStyles() {
      const styles = `
            <style type="text/css" scoped>

                .vf-my-form .vf-multiselect-options {
                    padding: 0px !important;
                }

                .vf-my-form *,
                .vf-my-form *:before,
                .vf-my-form *:after,
                .vf-my-form:root {
                    --vf-primary: ${this.botParameters.primaryColor};
                    --vf-border-color-input-focus: ${this.hexToRgba(
        this.botParameters.primaryColor,
        0.5
      )};
                    --vf-border-color-checkbox-focus: ${this.hexToRgba(
        this.botParameters.primaryColor,
        0.5
      )};
                    --vf-ring-color: ${this.hexToRgba(
        this.botParameters.primaryColor,
        0.5
      )};
                    --vf-link-color: ${this.hexToRgba(
        this.botParameters.primaryColor,
        0.5
      )};
                }

                #dropdown-phone_number {
                  z-index: 2147483643;
                  background-color: white;
                  border: none;
                }
            </style>`;

      return styles;
    },
  },
  methods: {
    ...mapActions(useBotStore, [
      "setDynamicFormData",
      "actionExecuteBackend",
      "setStatusTyping",
      "processMessage",
      "resetPendingAction",
      "responseWithErrorMessage",
    ]),

    getLocalizedText(text) {
      if (!text) return '';
      // If text is a string, return it as-is
      if (typeof text === 'string') return text;
      // If text is an object, return the localized version
      if (typeof text === 'object') {
        return text[this.locale] || text.en || '';
      }
      return '';
    },

    setFormConfig() {
      if (this.dynamicForms[this.formName]) {
        this.formConfig = this.dynamicForms[this.formName];

        // Only set nationality default if schema is loaded from backend
        if (
          this.geolocationNationality &&
          this.formConfig.schema?.nationality &&
          this.formConfig.schema.nationality.type === "nationality"
        ) {
          this.formConfig.schema.nationality.default =
            this.geolocationNationality;
        }

        // Only load data if schema is available
        if (this.formConfig.schema) {
          nextTick(() => {
            this.loadDefaultData();
            // Load persisted form values after form is mounted
            this.loadPersistedValues();
          });
        }
      }
    },

    loadDefaultData() {
      const formSchema = this.dynamicForms[this.formName]?.schema;
      if (!formSchema) return;

      if (this.formName === "localeForm") {
        // localeForm now only has hidden auto-detected fields
        // purpose is handled separately via inference or purposeForm
        const defaultData = {
          language: this.$i18n.locale,
          currency: formSchema.currency?.default || "USD",
          is_foreigner: formSchema.is_foreigner?.default || false,
        };
        this.setDynamicFormData("localeForm", defaultData);
      } else if (this.formName === "purposeForm") {
        // purposeForm is shown inline when purpose can't be inferred
        const defaultData = {
          purpose: formSchema.purpose?.default || "Buy",
        };
        this.setDynamicFormData("purposeForm", defaultData);
      } else if (this.formName === "contactForm") {
        // Only set default data if no data exists (not persisted from previous session)
        if (!this.dynamicForms.contactForm.data || Object.keys(this.dynamicForms.contactForm.data).length === 0) {
          const defaultData = {
            first_name: "",
            last_name: "",
            email: "",
            phone_number: "",
            nationality: formSchema.nationality?.default || "",
          };
          this.setDynamicFormData("contactForm", defaultData);
        }
      }
    },

    loadPersistedValues() {
      // Load persisted values into the form after it's mounted
      if (this.formName === "contactForm" && this.dynamicForms.contactForm.data) {
        const persistedData = this.dynamicForms.contactForm.data;

        // Wait for form to be ready, then load the values
        nextTick(async () => {
          if (this.$refs.form$) {
            await this.$refs.form$.load(persistedData);
            this.$refs.form$.resetValidators();
          }
        });
      }
    },

    async submit(form$) {
      this.isSubmitting = true;
      const form$Ref = this.$refs.form$;
      if (form$Ref) form$Ref.submitting = true;

      const data = form$.data;
      this.setDynamicFormData(this.formName, data);

      if (this.useStoreActions) {
        // Popup form behavior - uses hooks or legacy submit callback

        try {
          // Check if form has hooks configured
          if (hasHooks(this.formConfig, "after_submit")) {
            // Execute hooks from form config
            const afterSubmitHooks = getFormHooks(this.formConfig, "after_submit");
            const botStore = useBotStore();
            await executeHooks(afterSubmitHooks, this.formName, data, botStore);
          } else if (this.formConfig.submit) {
            // Fallback to legacy submit callback
            await this.formConfig.submit(data, this.formConfig);
          }
        } catch (err) {
          console.error(`[DynamicForm] Submit error for ${this.formName}:`, err);
        } finally {
          form$Ref.submitting = false;
          this.isSubmitting = false;
        }
      } else {
        // Inline form behavior - execute pending action
        if (this.pendingAction) {
          // Optimistic: close form and show success immediately, backend continues in background
          this.$emit('form-completed');
          if (form$Ref) form$Ref.submitting = false;
          this.isSubmitting = false;

          try {
            this.setStatusTyping(true);
            const res = await this.actionExecuteBackend({
              url: this.pendingAction.urlParam,
              params: this.pendingAction.backendParams,
            });

            if (res.status === 200) {
              this.processMessage(res.data);
            } else {
              this.setStatusTyping(false);
              this.responseWithErrorMessage();
            }
          } catch (err) {
            this.setStatusTyping(false);
            this.responseWithErrorMessage();
          }

          this.resetPendingAction();
        } else {
          if (form$Ref) form$Ref.submitting = false;
          this.isSubmitting = false;
        }
      }
    },

    hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
  },
};
</script>

<style scoped>
.form-header {
  margin-bottom: 1rem;
}

.form-header h3 {
  font-size: 1.1rem;
  line-height: 1.4;
  font-weight: 500;
}

@media (max-width: 768px) {
  .form-header h3 {
    font-size: 1rem;
  }
}

.vf-my-form *,
.vf-my-form *:before,
.vf-my-form *:after,
.vf-my-form:root {
  --vf-space-static-tag-1: 0.25rem;
  --vf-space-static-tag-2: 0.5rem;
  --vf-space-static-tag-3: 0.75rem;
  --vf-gutter: 10px;
  --vf-gutter-sm: 5px;
  --vf-primary-darker: #0056b3;
  --vf-color-on-primary: #ffffff;
  --vf-danger: #dc3545;
  --vf-danger-lighter: #f9dcdf;
  --vf-success: #28a745;
  --vf-success-lighter: #c4f1ce;
  --vf-gray-50: #f9fafb;
  --vf-gray-100: #f8f9fa;
  --vf-gray-200: #e9ecef;
  --vf-gray-300: #dee2e6;
  --vf-gray-400: #ced4da;
  --vf-gray-500: #adb5bd;
  --vf-gray-600: #6c757d;
  --vf-gray-700: #495057;
  --vf-gray-800: #343a40;
  --vf-gray-900: #212529;
  --vf-dark-50: #f9fafb;
  --vf-dark-100: #f8f9fa;
  --vf-dark-200: #e9ecef;
  --vf-dark-300: #dee2e6;
  --vf-dark-400: #ced4da;
  --vf-dark-500: #adb5bd;
  --vf-dark-600: #6c757d;
  --vf-dark-700: #495057;
  --vf-dark-800: #343a40;
  --vf-dark-900: #212529;
  --vf-ring-width: 0.2rem;
  --vf-link-decoration: underline;
  --vf-font-size: 1rem;
  --vf-font-size-sm: 0.875rem;
  --vf-font-size-lg: 1.25rem;
  --vf-font-size-small: 0.8rem;
  --vf-font-size-small-sm: 0.7rem;
  --vf-font-size-small-lg: 1rem;
  --vf-font-size-h1: 2.5rem;
  --vf-font-size-h1-sm: 2.5rem;
  --vf-font-size-h1-lg: 2.5rem;
  --vf-font-size-h2: 2rem;
  --vf-font-size-h2-sm: 2rem;
  --vf-font-size-h2-lg: 2rem;
  --vf-font-size-h3: 1.75rem;
  --vf-font-size-h3-sm: 1.75rem;
  --vf-font-size-h3-lg: 1.75rem;
  --vf-font-size-h4: 1.5rem;
  --vf-font-size-h4-sm: 1.5rem;
  --vf-font-size-h4-lg: 1.5rem;
  --vf-font-size-h1-mobile: 2.5rem;
  --vf-font-size-h1-mobile-sm: 2.5rem;
  --vf-font-size-h1-mobile-lg: 2.5rem;
  --vf-font-size-h2-mobile: 2rem;
  --vf-font-size-h2-mobile-sm: 2rem;
  --vf-font-size-h2-mobile-lg: 2rem;
  --vf-font-size-h3-mobile: 1.75rem;
  --vf-font-size-h3-mobile-sm: 1.75rem;
  --vf-font-size-h3-mobile-lg: 1.75rem;
  --vf-font-size-h4-mobile: 1.5rem;
  --vf-font-size-h4-mobile-sm: 1.5rem;
  --vf-font-size-h4-mobile-lg: 1.5rem;
  --vf-font-size-blockquote: 1.25rem;
  --vf-font-size-blockquote-sm: 1.25rem;
  --vf-font-size-blockquote-lg: 1.25rem;
  --vf-line-height: 1.5rem;
  --vf-line-height-sm: 1.5rem;
  --vf-line-height-lg: 1.5rem;
  --vf-line-height-small: 1.5rem;
  --vf-line-height-small-sm: 1.5rem;
  --vf-line-height-small-lg: 1.5rem;
  --vf-line-height-headings: 1.2rem;
  --vf-line-height-headings-sm: 1.2rem;
  --vf-line-height-headings-lg: 1.2rem;
  --vf-line-height-blockquote: 1.5;
  --vf-line-height-blockquote-sm: 1.25;
  --vf-line-height-blockquote-lg: 2;
  --vf-letter-spacing: 0px;
  --vf-letter-spacing-sm: 0px;
  --vf-letter-spacing-lg: 0px;
  --vf-letter-spacing-small: 0px;
  --vf-letter-spacing-small-sm: 0px;
  --vf-letter-spacing-small-lg: 0px;
  --vf-letter-spacing-headings: 0px;
  --vf-letter-spacing-headings-sm: 0px;
  --vf-letter-spacing-headings-lg: 0px;
  --vf-letter-spacing-blockquote: 0px;
  --vf-letter-spacing-blockquote-sm: 0px;
  --vf-letter-spacing-blockquote-lg: 0px;
  --vf-gutter: 15px;
  --vf-gutter-sm: 7.5px;
  --vf-gutter-lg: 15px;
  --vf-min-height-input: 2.375rem;
  --vf-min-height-input-sm: 2.125rem;
  --vf-min-height-input-lg: 2.625rem;
  --vf-py-input: 0.375rem;
  --vf-py-input-sm: 0.25rem;
  --vf-py-input-lg: 0.5rem;
  --vf-px-input: 0.75rem;
  --vf-px-input-sm: 0.5rem;
  --vf-px-input-lg: 1rem;
  --vf-py-btn: 0.375rem;
  --vf-py-btn-sm: 0.25rem;
  --vf-py-btn-lg: 0.5rem;
  --vf-px-btn: 0.75rem;
  --vf-px-btn-sm: 0.5rem;
  --vf-px-btn-lg: 1rem;
  --vf-py-btn-small: 0.28125rem;
  --vf-py-btn-small-sm: 0.1875rem;
  --vf-py-btn-small-lg: 0.375rem;
  --vf-px-btn-small: 0.5625rem;
  --vf-px-btn-small-sm: 0.375rem;
  --vf-px-btn-small-lg: 0.75rem;
  --vf-py-group-tabs: 0.375rem;
  --vf-py-group-tabs-sm: 0.25rem;
  --vf-py-group-tabs-lg: 0.5rem;
  --vf-px-group-tabs: 0.75rem;
  --vf-px-group-tabs-sm: 0.5rem;
  --vf-px-group-tabs-lg: 1rem;
  --vf-py-group-blocks: 0.75rem;
  --vf-py-group-blocks-sm: 0.625rem;
  --vf-py-group-blocks-lg: 0.875rem;
  --vf-px-group-blocks: 1rem;
  --vf-px-group-blocks-sm: 1rem;
  --vf-px-group-blocks-lg: 1rem;
  --vf-py-tag: 0px;
  --vf-py-tag-sm: 0px;
  --vf-py-tag-lg: 0px;
  --vf-px-tag: 0.4375rem;
  --vf-px-tag-sm: 0.4375rem;
  --vf-px-tag-lg: 0.4375rem;
  --vf-py-slider-tooltip: 0.125rem;
  --vf-py-slider-tooltip-sm: 0.0625rem;
  --vf-py-slider-tooltip-lg: 0.1875rem;
  --vf-px-slider-tooltip: 0.375rem;
  --vf-px-slider-tooltip-sm: 0.3125rem;
  --vf-px-slider-tooltip-lg: 0.5rem;
  --vf-py-blockquote: 0.5rem;
  --vf-py-blockquote-sm: 0.5rem;
  --vf-py-blockquote-lg: 0.5rem;
  --vf-px-blockquote: 1rem;
  --vf-px-blockquote-sm: 1rem;
  --vf-px-blockquote-lg: 1rem;
  --vf-py-hr: 0.25rem;
  --vf-space-addon: 0.75rem;
  --vf-space-addon-sm: 0.75rem;
  --vf-space-addon-lg: 0.75rem;
  --vf-space-checkbox: 0.25rem;
  --vf-space-checkbox-sm: 0.25rem;
  --vf-space-checkbox-lg: 0.25rem;
  --vf-space-tags: 0.1875rem;
  --vf-space-tags-sm: 0.1875rem;
  --vf-space-tags-lg: 0.1875rem;
  --vf-space-static-tag-1: 1rem;
  --vf-space-static-tag-2: 2rem;
  --vf-space-static-tag-3: 3rem;
  --vf-floating-top: 0rem;
  --vf-floating-top-sm: 0rem;
  --vf-floating-top-lg: 0.6875rem;
  --vf-bg-input: #ffffff;
  --vf-bg-input-focus: #ffffff;
  --vf-bg-input-hover: #ffffff;
  --vf-bg-input-danger: #ffffff;
  --vf-bg-input-success: #ffffff;
  --vf-bg-checkbox: #ffffff;
  --vf-bg-checkbox-hover: #ffffff;
  --vf-bg-checkbox-focus: #ffffff;
  --vf-bg-checkbox-danger: #ffffff;
  --vf-bg-checkbox-success: #ffffff;
  --vf-bg-disabled: #e9ecef;
  --vf-bg-selected: #1118270d;
  --vf-bg-passive: var(--vf-gray-300);
  --vf-bg-icon: var(--vf-gray-500);
  --vf-bg-danger: var(--vf-danger-lighter);
  --vf-bg-success: var(--vf-success-lighter);
  --vf-bg-tag: var(--vf-primary);
  --vf-bg-slider-handle: var(--vf-primary);
  --vf-bg-toggle-handle: #ffffff;
  --vf-bg-date-head: var(--vf-gray-100);
  --vf-bg-addon: #e9ecef;
  --vf-bg-btn: var(--vf-primary);
  --vf-bg-btn-danger: var(--vf-danger);
  --vf-bg-btn-secondary: var(--vf-gray-200);
  --vf-bg-table-header: var(--vf-gray-100);
  --vf-color-input: var(--vf-gray-700);
  --vf-color-input-focus: var(--vf-gray-700);
  --vf-color-input-hover: var(--vf-gray-700);
  --vf-color-input-danger: var(--vf-gray-700);
  --vf-color-input-success: var(--vf-gray-700);
  --vf-color-disabled: var(--vf-gray-700);
  --vf-color-placeholder: var(--vf-gray-600);
  --vf-color-passive: var(--vf-gray-700);
  --vf-color-muted: var(--vf-gray-600);
  --vf-color-floating: var(--vf-gray-600);
  --vf-color-floating-success: var(--vf-gray-600);
  --vf-color-floating-danger: var(--vf-gray-600);
  --vf-color-floating-focus: var(--vf-gray-600);
  --vf-color-danger: var(--vf-danger);
  --vf-color-success: var(--vf-success);
  --vf-color-tag: var(--vf-color-on-primary);
  --vf-color-addon: var(--vf-gray-700);
  --vf-color-date-head: var(--vf-gray-700);
  --vf-color-btn: var(--vf-color-on-primary);
  --vf-color-btn-danger: #ffffff;
  --vf-color-btn-secondary: var(--vf-gray-700);
  --vf-color-table-header: var(--vf-gray-700);
  --vf-border-color-input: var(--vf-gray-400);
  --vf-border-color-input-focus: #80bdff;
  --vf-border-color-input-hover: var(--vf-gray-400);
  --vf-border-color-input-danger: var(--vf-gray-400);
  --vf-border-color-input-success: var(--vf-gray-400);
  --vf-border-color-checkbox: var(--vf-gray-400);
  --vf-border-color-checkbox-focus: #80bdff;
  --vf-border-color-checkbox-hover: var(--vf-gray-400);
  --vf-border-color-checkbox-danger: var(--vf-gray-400);
  --vf-border-color-checkbox-success: var(--vf-gray-400);
  --vf-border-color-checked: var(--vf-primary);
  --vf-border-color-passive: var(--vf-gray-300);
  --vf-border-color-slider-tooltip: var(--vf-primary);
  --vf-border-color-tag: var(--vf-primary);
  --vf-border-color-btn: var(--vf-primary);
  --vf-border-color-btn-danger: var(--vf-danger);
  --vf-border-color-btn-secondary: var(--vf-gray-200);
  --vf-border-color-blockquote: var(--vf-gray-400);
  --vf-border-color-hr: var(--vf-gray-600);
  --vf-border-color-signature-hr: var(--vf-gray-600);
  --vf-border-color-table: var(--vf-gray-400);
  --vf-border-width-input-t: 1px;
  --vf-border-width-input-r: 1px;
  --vf-border-width-input-b: 1px;
  --vf-border-width-input-l: 1px;
  --vf-border-width-radio-t: 1px;
  --vf-border-width-radio-r: 1px;
  --vf-border-width-radio-b: 1px;
  --vf-border-width-radio-l: 1px;
  --vf-border-width-checkbox-t: 1px;
  --vf-border-width-checkbox-r: 1px;
  --vf-border-width-checkbox-b: 1px;
  --vf-border-width-checkbox-l: 1px;
  --vf-border-width-dropdown: 1px;
  --vf-border-width-btn: 1px;
  --vf-border-width-toggle: 0.125rem;
  --vf-border-width-tag: 1px;
  --vf-border-width-table: 1px;
  --vf-shadow-input: inset 0 1px 1px rgba(0, 0, 0, 0.075);
  --vf-shadow-input-hover: inset 0 1px 1px rgba(0, 0, 0, 0.075);
  --vf-shadow-input-focus: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  --vf-shadow-handles: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-shadow-handles-hover: inset 0 1px 1px rgba(0, 0, 0, 0.075);
  --vf-shadow-handles-focus: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  --vf-shadow-btn: inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 1px 1px rgba(0, 0, 0, 0.075);
  --vf-shadow-dropdown: 0px 0px 0px 0px rgba(0, 0, 0, 0);
  --vf-radius-input: 0.25rem;
  --vf-radius-input-sm: 0.2rem;
  --vf-radius-input-lg: 0.3rem;
  --vf-radius-btn: 0.25rem;
  --vf-radius-btn-sm: 0.2rem;
  --vf-radius-btn-lg: 0.3rem;
  --vf-radius-small: 0.25rem;
  --vf-radius-small-sm: 0.2rem;
  --vf-radius-small-lg: 0.25rem;
  --vf-radius-large: 0.25rem;
  --vf-radius-large-sm: 0.2rem;
  --vf-radius-large-lg: 0.25rem;
  --vf-radius-tag: 0.25rem;
  --vf-radius-tag-sm: 0.2rem;
  --vf-radius-tag-lg: 0.25rem;
  --vf-radius-checkbox: 0.25rem;
  --vf-radius-checkbox-sm: 0.2rem;
  --vf-radius-checkbox-lg: 0.25rem;
  --vf-radius-slider: 0.25rem;
  --vf-radius-slider-sm: 0.2rem;
  --vf-radius-slider-lg: 0.25rem;
  --vf-radius-image: 0.25rem;
  --vf-radius-image-sm: 0.2rem;
  --vf-radius-image-lg: 0.25rem;
  --vf-radius-gallery: 0.25rem;
  --vf-radius-gallery-sm: 0.2rem;
  --vf-radius-gallery-lg: 0.25rem;
  --vf-checkbox-size: 1rem;
  --vf-checkbox-size-sm: 0.875rem;
  --vf-checkbox-size-lg: 1rem;
  --vf-gallery-size: 6rem;
  --vf-gallery-size-sm: 5rem;
  --vf-gallery-size-lg: 7rem;
  --vf-toggle-width: 3rem;
  --vf-toggle-width-sm: 2.75rem;
  --vf-toggle-width-lg: 3rem;
  --vf-toggle-height: 1.25rem;
  --vf-toggle-height-sm: 1.125rem;
  --vf-toggle-height-lg: 1.25rem;
  --vf-slider-height: 0.375rem;
  --vf-slider-height-sm: 0.3125rem;
  --vf-slider-height-lg: 0.5rem;
  --vf-slider-height-vertical: 20rem;
  --vf-slider-height-vertical-sm: 20rem;
  --vf-slider-height-vertical-lg: 20rem;
  --vf-slider-handle-size: 1rem;
  --vf-slider-handle-size-sm: 0.875rem;
  --vf-slider-handle-size-lg: 1.25rem;
  --vf-slider-tooltip-distance: 0.5rem;
  --vf-slider-tooltip-distance-sm: 0.375rem;
  --vf-slider-tooltip-distance-lg: 0.5rem;
  --vf-slider-tooltip-arrow-size: 0.3125rem;
  --vf-slider-tooltip-arrow-size-sm: 0.3125rem;
  --vf-slider-tooltip-arrow-size-lg: 0.3125rem;
}
</style>
