/**
 * Form Hooks System - Backend-Driven Form Lifecycle Hooks
 *
 * This module provides a hook registry and execution system for form lifecycle events.
 * Hooks are defined in backend parameters.yml and executed by the frontend at specific
 * lifecycle points.
 *
 * Hook Types:
 * - on_form_show: Before form displays (analytics, set defaults)
 * - on_form_close: When form is dismissed (cleanup, fallback)
 * - before_submit: Before form data is sent (validate, transform)
 * - after_submit: After successful submit (trigger side effects)
 * - before_conversation_start: After locale form submit
 * - after_contact_collected: After contact form submit
 * - on_exit_intent_show: When exit intent modal appears
 * - on_exit_intent_accept: User accepts exit intent
 * - on_exit_intent_dismiss: User dismisses exit intent
 * - on_load_defaults: When form mounts, load defaults
 * - on_load_persisted: Load persisted values from session
 */

import { setGlobalLocale, getGlobalLocale, t } from "@/i18n";
import { uuidv7 } from "uuidv7";
import { botHelper } from "@/helpers/bot";
import { geolocationService } from "@/services/geolocation";

/**
 * Hook Registry - Maps hook names to their implementations
 *
 * Each hook receives:
 * - formName: The name of the form (localeForm, contactForm, etc.)
 * - data: The form data or relevant context
 * - botStore: The Pinia bot store instance
 *
 * Hooks can return modified data or undefined/void.
 */
export const hookRegistry = {
  // === FORM LIFECYCLE ===

  /**
   * Called before form displays
   */
  on_form_show: async (formName, data) => {
    console.log(`[FormHooks] Form ${formName} shown`);
    return data;
  },

  /**
   * Called when form is dismissed without submitting
   */
  on_form_close: async (formName, data, botStore) => {
    console.log(`[FormHooks] Form ${formName} closed`);
    botStore.setDynamicForm({ show: false });
    return data;
  },

  // === DEFAULT VALUES ===

  /**
   * Load default values for a form
   * For localeForm, hidden fields are auto-detected from IP/browser
   * Note: purpose is now inferred from budget or collected via purposeForm,
   * so it's no longer part of localeForm
   */
  on_load_defaults: async (formName, schema, botStore) => {
    if (formName === "localeForm") {
      // Auto-detect hidden fields from IP geolocation and browser
      const supportedLocales = botStore.botParameters?.supportedLocales || ['en', 'fr'];
      const localeDefaults = await geolocationService.getLocaleDefaults(supportedLocales);

      // Purpose is no longer collected in localeForm - it's inferred from budget
      // or collected via inline purposeForm when needed
      return localeDefaults;
    }

    if (formName === "purposeForm") {
      // Purpose form defaults
      return {
        purpose: schema?.purpose?.default || "Buy",
      };
    }

    if (formName === "contactForm") {
      return {
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        nationality:
          botStore.geolocationNationality ||
          schema?.nationality?.default ||
          "",
      };
    }

    if (formName === "emailOnlyForm") {
      return {
        email: "",
        wants_expert_support: null,
      };
    }

    return {};
  },

  /**
   * Load persisted values from session storage
   */
  on_load_persisted: async (formName, defaults, botStore) => {
    const persisted = botStore.dynamicForms[formName]?.data;
    if (persisted && Object.keys(persisted).length > 0) {
      return { ...defaults, ...persisted };
    }
    return defaults;
  },

  // === CONVERSATION LIFECYCLE ===

  /**
   * Called after locale form submit, before conversation starts
   * - Transforms is_foreigner boolean to accessible_property_types array
   * - Sets global locale
   * - Creates conversation
   * - Shows greeting message
   */
  before_conversation_start: async (formName, data, botStore) => {
    // Transform is_foreigner boolean to accessible_property_types array
    // true (Mauritian) → can access both local (0) and foreigner (1) properties
    // false (Foreigner) → can only access foreigner (1) properties
    const transformedData = { ...data };
    transformedData.is_foreigner = data.is_foreigner ? ["0", "1"] : ["1"];

    // Set global locale based on selected language
    setGlobalLocale(data.language);

    // Save the transformed data to store
    botStore.setDynamicFormData("localeForm", transformedData);

    // Hide the form
    botStore.setDynamicForm({ show: false });

    // Create new conversation
    botStore.setConversationId(uuidv7());
    botStore.createConversation();

    // Show greeting message if no messages exist
    if (botStore.messagesDataForCurrentConversation.length < 1) {
      const greetingMessage = botStore.botParameters.greetingMessage
        ? JSON.parse(botStore.botParameters.greetingMessage)[getGlobalLocale()]
        : t("text.greetingMessage");

      botStore.setMessagesData({
        id: uuidv7(),
        conversation_id: botStore.session.conversationId,
        sender_id: null,
        content: greetingMessage,
        delivered: false,
        viewed: false,
        sent_at: null,
        message_type: "bot",
        metadata: {},
        tags: {},
        tenantId: null,
      });
    }

    return transformedData;
  },

  /**
   * Called after contact form submit
   * - Executes any pending action that required contact info
   */
  after_contact_collected: async (formName, data, botStore) => {
    // Save form data
    botStore.setDynamicFormData("contactForm", data);

    // Hide the form
    botStore.setDynamicForm({ show: false });

    // Execute pending action if any
    await botHelper.executePendingAction(botStore);

    return data;
  },

  /**
   * Called after email-only form submit for buyer's guide
   */
  send_buyers_guide: async (formName, data, botStore) => {
    // Save form data
    botStore.setDynamicFormData("emailOnlyForm", data);

    // The actual action execution is handled by the DynamicForm component
    // via the inline form behavior (pendingAction)
    return data;
  },

  /**
   * Called after inline form submit to resume a pending operation
   * Used by purposeForm when purpose is collected after search was attempted
   * - Saves the collected field value
   * - Hides the form
   * - Automatically resumes the search with the collected data
   */
  resume_pending_operation: async (formName, data, botStore) => {
    console.log(`[FormHooks] Resuming pending operation after ${formName} submit`);

    // Save the collected data to the form
    botStore.setDynamicFormData(formName, data);

    // Update the locale form data with the new field (e.g., purpose)
    // Merge with existing locale data if present
    const existingLocaleData = botStore.dynamicForms.localeForm?.data || {};
    botStore.setDynamicFormData("localeForm", { ...existingLocaleData, ...data });

    // Hide the form
    botStore.setDynamicForm({ show: false });

    // Check if there's a pending field collection operation to resume
    const pendingOp = botStore.pendingFieldCollection;
    if (pendingOp?.operation) {
      console.log('[FormHooks] Resuming pending search operation...');

      // Clear the pending state
      botStore.clearPendingFieldCollection();

      // Send a message to continue the search
      // The backend will now have the purpose field and should execute the search
      botStore.setStatusTyping(true);

      // Send a simple continuation message - the backend has the context
      const continueMessage = {
        id: uuidv7(),
        conversation_id: botStore.session.conversationId,
        sender_id: null,
        content: `continue search`,  // Simple trigger for backend
        delivered: false,
        viewed: false,
        sent_at: null,
        message_type: "user",
        metadata: {},
        tags: {},
        tenantId: null,
      };
      botStore.setMessagesData(continueMessage);
      botStore.sendMessage([continueMessage]);
    }

    return data;
  },


  // === EXIT INTENT ===

  /**
   * Called when exit intent modal appears
   */
  on_exit_intent_show: async (data) => {
    console.log("[FormHooks] Exit intent modal shown");
    return data;
  },

  /**
   * Called when user accepts exit intent (wants to be contacted)
   */
  on_exit_intent_accept: async (data, botStore) => {
    botStore.markExitIntentShown();
    botStore.toggleDynamicForm("contactForm");
    return data;
  },

  /**
   * Called when user dismisses exit intent
   */
  on_exit_intent_dismiss: async (data, botStore) => {
    botStore.markExitIntentShown();
    botStore.markFormDismissed();
    botStore.setStatusActive(false);
    return data;
  },
};

/**
 * Execute a list of hooks in sequence
 *
 * @param {string[]} hookNames - Array of hook names to execute
 * @param {string} formName - Name of the form
 * @param {object} data - Data to pass through hooks (can be transformed)
 * @param {object} botStore - Pinia bot store instance
 * @returns {Promise<object>} - The final data after all hooks have run
 */
export async function executeHooks(
  hookNames,
  formName,
  data,
  botStore
) {
  if (!hookNames || !Array.isArray(hookNames)) {
    return data;
  }

  let result = data;

  for (const hookName of hookNames) {
    const hook = hookRegistry[hookName];

    if (hook) {
      try {
        const hookResult = await hook(formName, result, botStore);
        // If hook returns a value, use it; otherwise keep previous result
        if (hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`[FormHooks] Error executing hook '${hookName}':`, error);
        // Continue with other hooks even if one fails
      }
    } else {
      console.warn(`[FormHooks] Unknown hook: ${hookName}`);
    }
  }

  return result;
}

/**
 * Get hooks configuration for a form from backend config
 *
 * @param {object} formConfig - Form configuration from backend
 * @param {string} hookType - The type of hook (after_submit, before_submit, etc.)
 * @returns {string[]} - Array of hook names to execute
 */
export function getFormHooks(formConfig, hookType) {
  return formConfig?.hooks?.[hookType] || [];
}

/**
 * Check if a form has hooks configured for a specific type
 *
 * @param {object} formConfig - Form configuration from backend
 * @param {string} hookType - The type of hook
 * @returns {boolean}
 */
export function hasHooks(formConfig, hookType) {
  const hooks = getFormHooks(formConfig, hookType);
  return hooks.length > 0;
}

/**
 * Check if a form is configured as silent (auto-submit without user interaction)
 *
 * @param {object} formConfig - Form configuration from backend
 * @returns {boolean}
 */
export function isSilentForm(formConfig) {
  return formConfig?.silent === true;
}

/**
 * Auto-submit a silent form using detected defaults
 * Called during bot initialization for forms like localeForm
 *
 * @param {string} formName - Name of the form
 * @param {object} formConfig - Form configuration
 * @param {object} botStore - Pinia bot store instance
 * @returns {Promise<object|null>} - The submitted data or null if not silent
 */
export async function autoSubmitSilentForm(formName, formConfig, botStore) {
  if (!isSilentForm(formConfig)) {
    return null;
  }

  console.log(`[FormHooks] Auto-submitting silent form: ${formName}`);

  // Load defaults using geolocation
  const defaults = await hookRegistry.on_load_defaults(formName, formConfig.schema, botStore);

  // Execute after_submit hooks
  const afterSubmitHooks = getFormHooks(formConfig, "after_submit");
  const result = await executeHooks(afterSubmitHooks, formName, defaults, botStore);

  console.log(`[FormHooks] Silent form ${formName} auto-submitted with:`, result);
  return result;
}

export default {
  hookRegistry,
  executeHooks,
  getFormHooks,
  hasHooks,
  isSilentForm,
  autoSubmitSilentForm,
};
