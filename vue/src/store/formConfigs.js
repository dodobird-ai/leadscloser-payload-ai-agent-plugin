/**
 * Form Configurations - Submit handlers for backend-driven forms
 *
 * Form schemas are now entirely backend-driven, fetched from /tenants/{tenant}/forms API.
 * This module provides:
 * - Submit handlers that execute hooks from form config
 * - Legacy fallback for backwards compatibility
 * - Merge function to combine backend forms with submit handlers
 */

import { useBotStore } from "@/store/bot";
import { botHelper } from "@/helpers/bot";
import { setGlobalLocale, getGlobalLocale, t } from "@/i18n";
import { uuidv7 } from "uuidv7";
import { executeHooks, getFormHooks } from "@/hooks/formHooks";

/**
 * Create a submit handler that executes hooks from form config
 * @param {string} formName - The name of the form
 * @returns {Function} - Submit handler function
 */
export function createHookBasedSubmit(formName) {
  return async (data, formConfig) => {
    const botStore = useBotStore();

    // Get after_submit hooks from form config
    const afterSubmitHooks = getFormHooks(formConfig, "after_submit");

    if (afterSubmitHooks.length > 0) {
      // Execute hooks - they handle all the logic
      await executeHooks(afterSubmitHooks, formName, data, botStore);
    } else {
      // Fallback to legacy behavior if no hooks configured
      console.warn(`[formConfigs] No hooks configured for ${formName}, using legacy submit`);
      await legacySubmit(formName, data);
    }
  };
}

/**
 * Legacy submit handlers for backwards compatibility
 * Used when backend forms don't have hooks configured
 */
async function legacySubmit(formName, data) {
  const botStore = useBotStore();

  if (formName === "localeForm") {
    // Transform is_foreigner boolean to accessible_property_types array
    const transformedData = { ...data };
    transformedData.is_foreigner = data.is_foreigner ? ["0", "1"] : ["1"];

    botStore.setDynamicFormData("localeForm", transformedData);
    setGlobalLocale(data.language);
    botStore.setDynamicForm({ show: false });
    botStore.setConversationId(uuidv7());
    botStore.createConversation();

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
  } else if (formName === "contactForm") {
    botStore.setDynamicFormData("contactForm", data);
    await botStore.actionExecuteBackend({
      url: "save_user",
      params: data,
    });
    botStore.setDynamicForm({ show: false });
    await botHelper.executePendingAction(botStore);
  }
}

/**
 * Merge backend forms configuration with submit handlers
 * Backend provides schemas, this module provides submit handlers
 *
 * @param {import('@/types/forms-api').FormsConfigResponse} backendForms - Forms config from backend
 * @returns {Object<string, import('@/types/forms-api').FormConfig & { submit: Function }>} - Form configs with submit handlers attached
 */
export function mergeBackendForms(backendForms) {
  if (!backendForms || !backendForms.forms) {
    return {};
  }

  const mergedConfigs = {};

  Object.entries(backendForms.forms).forEach(([formName, backendConfig]) => {
    mergedConfigs[formName] = {
      ...backendConfig,
      submit: createHookBasedSubmit(formName),
    };
  });

  return mergedConfigs;
}
