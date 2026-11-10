import { uuidv7 } from "uuidv7";
import {
  $api,
  setupAuthorizationBackendHTTPClientInstances,
} from "@/services/api";
import { getGlobalLocale, t } from "@/i18n";
import { fakeMessages } from "@/helpers/fake-messages";

  const md = require("markdown-it")({ html: true }).use(require("markdown-it-multimd-table"));
const mila = require("markdown-it-link-attributes");

md.use(mila, {
  attrs: {
    target: "_blank",
    style: "color:blue;",
  },
});

const origin =
  process.env.NODE_ENV === "development"
    ? process.env.VUE_APP_CHATBOT_API_HOSTNAME
    : window.bot_parameters.apiHostname;

export const botHelper = {
  origin,
  createMessage,
  processMessage,
  convertMarkdownToHtml,
  responseWithErrorMessage,
  refreshToken,
  startRefreshTokenTimer,
  stopRefreshTokenTimer,
  debounce,
  executePendingAction,
  getLocalizedText,
  formatActions,
};

function createMessage(store) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        type: "text",
        text_answer: store.botParameters.errorMessage
          ? JSON.parse(store.botParameters.errorMessage)[getGlobalLocale()]
          : t("text.errorMessage"),
        items: [],
        disableInput: true,
      });
    }, 1000);
  });
}

function processMessage({ data, store, message_id, conversationId }) {
  let text_answer = data.text_answer;

  let formatted = {
    id: message_id,
    conversation_id: conversationId,
    sender_id: null,
    content: text_answer,
    delivered: false,
    viewed: false,
    sent_at: null,
    message_type: "bot",
    metadata: {
      items: (data.items?.elements || []).map((item) => ({
        sku: item.sku || item.item_id,
        name: item.name,
        brand: null,
        price: item.price,
        actions: formatActions(item.actions, getGlobalLocale()),
        item_id: item.item_id,
        category: item.category,
        currency: item.currency,
        item_url: item.item_url,
        image_url: item.image_url,
        ai_comment: item.ai_comment,
        description: item.description,
        sub_category: item.sub_category,
        meta_category: item.meta_category,
        description_metadata: item.description_metadata,
      })) || [],
    },
    tags: {},
    tenantId: null,

    // TODO UGLY: Backend API needs to update suggestions format to include 'action' parameter
    // Current format: ["suggestion 1", "suggestion 2"]
    // Expected format: [{ text: "suggestion 1", action: "auto_submit" }, { text: "suggestion 2", action: "populate_input" }]
    // For now, all API suggestions default to 'auto_submit' behavior (see InputSuggestion.vue handleSuggestionClick)
    suggestions: data.suggestions || [],
    actions: data.actions ? formatActions(data.actions, getGlobalLocale()) : [],
    search_criteria: data.search_criteria || [],
  };
  store.setMessagesData(formatted);
}

function convertMarkdownToHtml(data) {
  return md.render(data);
}

// TODO: find a more generalized way to get localized text
function getLocalizedText(textObj, locale) {
  if (!textObj || typeof textObj !== "object") return "";
  return textObj[locale] || textObj.en || Object.values(textObj)[0];
}

function formatActions(actions = {}, locale) {
  if (!actions || typeof actions !== "object") {
    return {};
  }
  const formatted = {};
  for (const [key, action] of Object.entries(actions)) {
    const updated = { ...action };
    if (action.frontend_params?.text) {
      updated.frontend_params = {
        ...action.frontend_params,
        text: getLocalizedText(action.frontend_params.text, locale),
      };
    }
    formatted[key] = updated;
  }
  return formatted;
}

function responseWithErrorMessage({ store }) {
  // Check if fake response on error mode is enabled (dev mode only)
  if (store.status.useFakeResponseOnError) {
    // Send fake message instead of error message with a delay
    setTimeout(() => {
      const response = fakeMessages[0];
      const res = {
        agent: "bot",
        ...response,
      };
      const message_id = uuidv7();
      const conversation_id = store.session.conversationId;
      processMessage({
        data: res,
        store,
        message_id,
        conversationId: conversation_id
      });
      store.setStatusTyping(false);
    }, 1500); // 1.5 second delay for more natural feel
  } else {
    // Normal error message flow
    createMessage(store).then((response) => {
      const res = {
        agent: "bot",
        ...response,
      };
      const message_id = uuidv7();
      const conversation_id = store.session.conversationId;
      processMessage({
        data: res,
        store,
        message_id,
        conversationId: conversation_id
      });

      store.setStatusTyping(false);
    });
  }
}

async function refreshToken(store) {
  stopRefreshTokenTimer();

  try {
    // ! to move to store
    const res = await $api.proxy.auth.makeRequest({
      params: {
        action: "dodo_chat_auth",
      },
      // headers,
    });
    if (res.status == 200) {
      const { token, expires_at } = res.data;
      if (token && expires_at) {
        const auth_token = {
          token,
          expires_at: expires_at * 1000,
        };
        store.setAuthToken(auth_token);
        startRefreshTokenTimer(store, auth_token);
      }
    }
  } catch (err) {
    throw new Error("Failed to refresh token");
  }
  setupAuthorizationBackendHTTPClientInstances();
}

let refreshTokenTimeoutId;

function startRefreshTokenTimer(store, auth_token) {
  const endTimeInMs = 45 * 1000;
  const timeout = Math.max(auth_token.expires_at - Date.now() - endTimeInMs, 0);
  refreshTokenTimeoutId = setTimeout(() => refreshToken(store), timeout);
}

function stopRefreshTokenTimer() {
  if (refreshTokenTimeoutId) {
    clearTimeout(refreshTokenTimeoutId);
    refreshTokenTimeoutId = null;
  }
}

function debounce(callback, delay) {
  let lastCall = 0;
  let timeoutId = null;

  function debounced(...args) {
    const now = Date.now();

    if (now - lastCall < delay) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = now;
        callback.apply(this, args);
      }, delay);
    } else {
      lastCall = now;
      callback.apply(this, args);
    }
  }

  debounced.cancel = function () {
    clearTimeout(timeoutId);
  };

  return debounced;
}

async function executePendingAction(store) {
  const { urlParam, frontendParams, backendParams } = store.actions.pending;

  const messagePayload = {
    id: uuidv7(),
    conversation_id: store.session.conversationId,
    sender_id: null,
    content: frontendParams.text,
    delivered: false,
    viewed: false,
    sent_at: null,
    message_type: "user",
    metadata: {},
    tags: {},
    tenantId: null,

  };
  store.setMessagesData(messagePayload);

  store.setStatusTyping(true);
  try {
    const res = await store.actionExecuteBackend({
      url: urlParam,
      params: backendParams,
    });

    if (res.status === 200) {
      await store.processMessage(res.data);
    } else {
      store.setStatusTyping(false);
    }
  } catch {
    store.responseWithErrorMessage();
  }

  store.resetPendingAction();
}
