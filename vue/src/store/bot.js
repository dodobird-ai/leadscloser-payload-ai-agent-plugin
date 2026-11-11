import { withActionAttribution } from '@/services/attribution.mjs';
import { defineStore } from "pinia";
import { uuidv7 } from "uuidv7";
import { $api } from "@/services/api";
import { botHelper } from "../helpers/bot";
import { getGlobalLocale } from "@/i18n";
import Telemetry from "../helpers/telemetry";
import { mergeBackendForms } from "./formConfigs";
import geolocationService from "@/services/geolocation";
const maxAttempts = 3;
const telemetry = new Telemetry();

export const useBotStore = defineStore("bot", {
  state: () => ({
    status: {
      active: false,
      typing: false,
      sidebar: false,
      maintenanceMode: false,
      smallScreen: false,
      chatMode: true,
      useFakeResponseOnError: false, // Dev mode: use fake message instead of error message
      skipAutoScroll: false, // When true, Content.vue won't auto-scroll on message data changes
    },
    geo: {
      userCountry: null, // User's detected country code (e.g., "MU", "US")
      isAllowed: true, // Whether user should see the chat widget
      isChecking: true // Loading state during geo-check
    },
    messages: {
      data: [],
      buffer: {
        messages: [
          // {
          //   id: uuidv7(),
          //   conversation_id: "01957f29-1d53-7efe-b23f-0166b0257dd6",
          //   sender_id: null,
          //   content: "Hello! How can I assist you today?",
          //   delivered: false,
          //   viewed: false,
          //   sent_at: null,
          //   message_type: "user",
          //   metadata: {
          //     items: [],
          //   },
          //   tags: {},
          //   tenantId: null,
          // }
        ],
        typingDelay: 1750, // 1.75 seconds
      },
    },
    conversations:
      [
        // {
        //   "id": "01957f29-1d53-7efe-b23f-0166b0257dd6",
        //   "agent_id": "01957f29-1d53-7efe-b23f-0166b0257dd6",
        //   "started_at": "2025-03-10T08:26:14.512Z",
        //   "ended_at": "2025-03-19T08:26:14.512Z",
        //   "status": "active",
        //   "tenant_id": "dec9d03d-f337-4d6b-a899-f09c0cbc8217",
        //   "tags": [
        //     "tag_1",
        //     "tag_shared"
        //   ]
        // }
      ],
    session: {
      conversationId: "",
      sessionId: "",
      uniqueUserId: "",
      authToken: {
        token: "",
        expires_at: 0,
      },
      cfStatus: {
        verified: false,
      },
      urlParams: {
        fullscreen: false,
        inventory: "",
        tags: [], // ?tags=a,b,c => ["a", "b", "c"]
      },
      geolocation: {
        nationality: null,
      }
    },
    dynamicForms: {
      // Form configs are loaded from backend via fetchFormsConfig()
      // Each form will have: { data: null, schema: {...}, hooks: {...}, submit: fn }
      localeForm: { data: null },
      contactForm: { data: null },
      emailOnlyForm: { data: null },
      purposeForm: { data: null },  // Inline form for purpose collection when not inferred
      show: false,
      currentForm: "",
    },
    actions: {
      pending: {
        urlParam: "",
        frontendParams: {},
        backendParams: {},
      },
    },
    // Pending field collection state - used when backend requests inline form input
    pendingFieldCollection: {
      fields: [],  // Fields to collect, e.g., ['purpose']
      operation: null,  // Operation to resume after collection, e.g., { type: 'search', intent: {...} }
    },
    botParameters: {
      tenantName: "", // Tenant name for API calls (e.g., "sothebys-realty-mu")
      greetingMessage: "",
      primaryColor: "#4356e0",
      title: "LeadsCloser",
      featuredImage: "",
      campaignId: "",
      autoFetchRecommendation: "on",
      cfSiteKey: "",
      inputSuggestionsJSON: [],
      apiHostname: "",
      inventoryCode: "",
      view: "both",
      errorMessage: "",
      locale: "en",
      maintenanceModePageOption: "", // Page slug where chatbot should display (requires maintenance mode on)
      displayOverridePage: "", // Page slug where chatbot should always display (bypasses geo-restrictions)
      geoFilterMode: "off", // Values: "off" | "include" | "exclude"
      geoCountries: [], // Array of ISO country codes: ["MU", "US", "FR"]
    },
    inputSuggestions: {
      groups: {
        available: [],
        consumed: [],
      },
    },
    emailCaptureTracking: {
      exitIntentShown: false,
      formDismissed: false,
    },
    floatingBubblesDismissed: false,  // Track if user dismissed floating bubbles
    // Paginated search: track item IDs the user has actually seen (scrolled past)
    // Sent with each message so the LLM reference tools only resolve seen items
    seenItemIds: [],
  }),

  persist: [
    {
      key: "bot-session",
      storage: sessionStorage,
      pick: [
        // "status.active" removed - prevents bot from reopening on page navigation
        "status.sidebar",
        "status.maintenanceMode",
        "session.conversationId",
        "dynamicForms.localeForm",
        "dynamicForms.contactForm",
        "dynamicForms.emailOnlyForm",
        "dynamicForms.purposeForm",  // Purpose is remembered for session
        "emailCaptureTracking",
        "floatingBubblesDismissed",  // Remember if floating bubbles were dismissed
      ],
    },
    {
      key: "bot-local",
      storage: localStorage,
      pick: ["conversations", "messages.data"]
    }
  ],

  getters: {
    $stateDefault: () => ({
      status: {
        active: false,
        typing: false,
        sidebar: false,
        maintenanceMode: false,
        smallScreen: false,
        chatMode: true
      },
      geo: {
        userCountry: null,
        isAllowed: true,
        isChecking: true
      },
      messages: {
        data: [],
        buffer: {
          messages: [],
          typingDelay: 1750, // 1.75 seconds
        },
      },
      conversations: [],
      session: {
        conversationId: "",
        sessionId: "",
        uniqueUserId: "",
        authToken: {
          token: "",
          expires_at: 0,
        },
        cfStatus: {
          verified: false,
        },
        urlParams: {
          fullscreen: false,
          inventory: "",
          tags: [],
        },
        geolocation: {
          nationality: null,
        },
      },
      dynamicForms: {
        // Form configs loaded from backend via fetchFormsConfig()
        localeForm: { data: null },
        contactForm: { data: null },
        emailOnlyForm: { data: null },
        purposeForm: { data: null },  // Inline form for purpose collection
        currentForm: "",
        show: false,
      },
      actions: {
        pending: {
          urlParam: "",
          frontendParams: {},
          backendParams: {},
        },
      },
      // Pending field collection state - used when backend requests inline form input
      pendingFieldCollection: {
        fields: [],
        operation: null,
      },
      botParameters: {
        greetingMessage: "",
        primaryColor: "",
        title: "",
        featuredImage: "",
        campaignId: "",
        autoFetchRecommendation: "on",
        cfSiteKey: "",
        inputSuggestionsJSON: [],
        apiHostname: "",
        inventoryCode: "",
        view: "both",
        errorMessage: "",
        locale: "en",
        maintenanceModePageOption: "",
        displayOverridePage: "",
        geoFilterMode: "off",
        geoCountries: [],
      },
      inputSuggestions: {
        groups: {
          available: [],
          consumed: [],
        },
      },
      emailCaptureTracking: {
        exitIntentShown: false,
        formDismissed: false,
      },
    }),
    statusActive: (state) => state.status.active,
    statusTyping: (state) => state.status.typing,
    statusSidebar: (state) => state.status.sidebar,
    statusMaintenanceMode: (state) => state.status.maintenanceMode,
    statusSmallScreen: (state) => state.status.smallScreen,
    geoUserCountry: (state) => state.geo.userCountry,
    geoIsAllowed: (state) => state.geo.isAllowed,
    geoIsChecking: (state) => state.geo.isChecking,
    messagesData: (state) => state.messages.data,
    messagesDataForCurrentConversation: (state) => {
      return state.messages.data.filter(message => message.conversation_id === state.session.conversationId);
    },
    messagesBuffer: (state) => state.messages.buffer,
    cfStatus: (state) => state.session.cfStatus,
    urlParams: (state) => state.session.urlParams,
    geolocationNationality: (state) => state.session.geolocation.nationality,
    availableInputSuggestionsGroups: (state) =>
      state.inputSuggestions.groups.available,
    consumedInputSuggestionsGroups: (state) =>
      state.inputSuggestions.groups.consumed,
    inputSuggestionsJSON: (state) => state.botParameters.inputSuggestionsJSON,
    statusChatMode: state => state.status.chatMode,
    statusUseFakeResponseOnError: state => state.status.useFakeResponseOnError,
    hasUserEmail: (state) => {
      return !!(state.dynamicForms.contactForm.data?.email);
    },
  },

  actions: {
    reset() {
      Object.assign(this, this.$stateDefault);
    },

    setStatusActive(status) {
      this.status.active = status;
    },

    toggleStatusActive() {
      this.status.active = !this.status.active;
    },

    setStatusTyping(status) {
      this.status.typing = status;
    },

    toggleStatusSidebar() {
      this.status.sidebar = !this.status.sidebar;
    },

    setStatusMaintenanceMode(status) {
      this.status.maintenanceMode = status;
    },

    setStatusSmallScreen(status) {
      this.status.smallScreen = status;
    },

    setStatusChatMode(status) {
      this.status.chatMode = status;
    },

    toggleUseFakeResponseOnError() {
      this.status.useFakeResponseOnError = !this.status.useFakeResponseOnError;
    },

    /**
     * Check if user's country is allowed based on geo-filtering settings
     * Bypasses check if in preview mode, accessed via maintenance URL parameter, or on display override page
     * Note: Page display override takes precedence over geo-restrictions
     */
    async checkGeoAccess() {
      // Check if user accessed via maintenance mode URL parameter or special pages
      const urlParams = new URLSearchParams(window.location.search);
      const hasMaintenanceParam = urlParams.get('chatMaintenanceMode') === 'true';
      const maintenanceModePageOption = this.botParameters.maintenanceModePageOption;
      const displayOverridePage = this.botParameters.displayOverridePage;
      const isMaintenanceModePageOption = maintenanceModePageOption &&
        window.location.pathname.includes(`/${maintenanceModePageOption}`);
      const isDisplayOverridePage = displayOverridePage &&
        window.location.pathname.includes(`/${displayOverridePage}`);

      // Bypass geo-filtering if in preview mode or accessed via special URL/page
      // Page display override settings take precedence over geo-restrictions
      if (this.botParameters.preview || hasMaintenanceParam || isMaintenanceModePageOption || isDisplayOverridePage) {
        this.geo.isAllowed = true;
        this.geo.isChecking = false;
        return;
      }

      // If geo-filtering is disabled, allow access
      if (this.botParameters.geoFilterMode === 'off') {
        this.geo.isAllowed = true;
        this.geo.isChecking = false;
        return;
      }

      try {
        // Fetch user's country from geolocation service
        const userCountry = await geolocationService.getUserCountry();
        this.geo.userCountry = userCountry;

        // If country detection fails, default to allowing access (fail-open)
        if (!userCountry) {
          console.warn('Could not detect user country. Allowing access by default.');
          this.geo.isAllowed = true;
          this.geo.isChecking = false;
          return;
        }

        // Check access based on filter mode
        const countryList = this.botParameters.geoCountries || [];
        const isInList = countryList.includes(userCountry.toUpperCase());

        if (this.botParameters.geoFilterMode === 'include') {
          // Include mode: allow only if country is in the list
          this.geo.isAllowed = isInList;
        } else if (this.botParameters.geoFilterMode === 'exclude') {
          // Exclude mode: allow only if country is NOT in the list
          this.geo.isAllowed = !isInList;
        }

        this.geo.isChecking = false;
      } catch (error) {
        console.error('Error checking geo access:', error);
        // On error, default to allowing access (fail-open)
        this.geo.isAllowed = true;
        this.geo.isChecking = false;
      }
    },

    setConversations(payload) {
      this.conversations = payload;
    },

    setMessagesData(payload) {
      const existingMessageIndex = this.messages.data.findIndex(
        (message) => message.id === payload.id
      );
      if (existingMessageIndex !== -1) {
        this.messages.data[existingMessageIndex] = payload;
      } else {
        this.messages.data.push(payload);
      }
    },

    replaceMessagesData(payload) {
      const { messages, conversationId } = payload;
      this.session.conversationId = conversationId;
      this.messages.data = messages;
    },

    pushMessagesBufferMessages(payload) {
      this.messages.buffer.messages.push(payload);
    },

    clearMessagesBufferMessages() {
      this.messages.buffer.messages = [];
    },

    setConversationId(payload) {
      this.session.conversationId = payload;
    },

    setAuthToken(payload) {
      this.session.authToken = payload;
    },

    setGeolocationNationality(payload) {
      this.session.geolocation.nationality = payload;
    },

    setAvailableInputSuggestionsGroups(payload) {
      this.inputSuggestions.groups.available = payload;
    },

    setConsumedInputSuggestionsGroups(payload) {
      this.inputSuggestions.groups.consumed = payload;
    },

    pushConsumedInputSuggestionsGroup(payload) {
      this.inputSuggestions.groups.consumed.push(payload);
    },

    setDynamicForm(payload) {
      this.dynamicForms = {
        ...this.dynamicForms,
        ...payload,
      };
    },

    setDynamicFormData(formName, data) {
      this.dynamicForms[formName].data = {
        ...this.dynamicForms[formName].data,
        ...data,
      };
    },

    toggleDynamicForm(currentForm) {
      this.dynamicForms = {
        ...this.dynamicForms,
        currentForm: currentForm,
        show: !this.dynamicForms.show,
      };
    },

    setPendingAction(payload) {
      this.actions.pending = payload;
    },

    resetPendingAction() {
      this.actions.pending = this.$stateDefault.actions.pending;
    },

    /**
     * Set pending field collection state
     * Called when backend requests inline form input (UICollectionMessage)
     * @param {Object} payload - { fields: string[], operation: object }
     */
    setPendingFieldCollection(payload) {
      this.pendingFieldCollection = payload;
    },

    /**
     * Clear pending field collection state
     */
    clearPendingFieldCollection() {
      this.pendingFieldCollection = {
        fields: [],
        operation: null,
      };
    },

    setCfStatus(key, value) {
      this.session.cfStatus[key] = value;
    },

    setUrlParams() {
      const params = new URLSearchParams(window.location.search);
      const userTags = window.bot_parameters?.userTags || [];
      const defaultTags = process.env.NODE_ENV === "development" ? ["vue_development"] : userTags;
      this.session.urlParams = {
        fullscreen: Object.fromEntries(params).chatFullscreen === "true",
        inventory: Object.fromEntries(params).inventory || this.botParameters.inventoryCode || "",
        tags: Object.fromEntries(params).tags ? Object.fromEntries(params).tags.split(",") : defaultTags
      };
    },

    setUrlParamsData(payload) {
      this.session.urlParams = {
        ...this.session.urlParams,
        ...payload,
      };
    },

    setSessionId(payload) {
      this.session.sessionId = payload;
    },

    setUniqueUserId(payload) {
      this.session.uniqueUserId = payload;
    },

    setBotParameters(payload) {
      Object.keys(payload).forEach((key) => {
        const newValue = payload[key];
        // Check if the new value is truthy; if not, skip it
        if (newValue !== "" && newValue !== null && newValue !== undefined) {
          this.botParameters[key] = newValue;
        }
      });

      // Fetch backend-driven forms config
      // Use provided tenantName or fall back to default for development
      const tenantName = payload.tenantName || this.botParameters.tenantName || "sothebys-realty-mu";
      if (tenantName) {
        this.botParameters.tenantName = tenantName;
        this.fetchFormsConfig(tenantName);
      }
    },

    // passSuggestion(payload) {
    //   const { productIndex, messageIndex } = payload;
    //   this.messages.data[messageIndex]["options"].splice(productIndex, 1);
    // },

    async fetchAuthToken() {
      try {
        await botHelper.refreshToken(this);
      } catch {
        return;
      }
    },

    responseWithErrorMessage() {
      botHelper.responseWithErrorMessage({
        store: this,
      });
    },

    processMessage(payload) {
      botHelper.processMessage({
        data: payload,
        store: this,
        message_id: uuidv7(),
        conversationId: this.session.conversationId
      });
      this.setStatusTyping(false);
    },

    async sendMessage(messageList) {
      const { tags, inventory, message_id } = messageList[0];

      //  * TEMPORARY concatenate the "incremental / fragmented user input" so that no changes be needed on the backend.
      const concatMessageTxt = messageList
        .map((message) => message.content)
        .join("\n");

      const messageObject = { ...messageList[0] };
      messageObject.text = concatMessageTxt;
      messageObject.session_id = this.session.sessionId;
      messageObject.conversation_id = this.session.conversationId;
      messageObject.unique_user_id = this.session.uniqueUserId;
      messageObject.campaign_id = this.botParameters.campaignId;
      messageObject.collected_infos = {
        ...this.dynamicForms.contactForm.data,
        ...this.dynamicForms.localeForm.data,
        ...this.dynamicForms.emailOnlyForm?.data,
      };

      messageObject.message_id = messageObject.id
      messageObject.tags = this.session.urlParams.tags
      messageObject.inventory = this.session.urlParams.inventory
      messageObject.seen_item_ids = this.seenItemIds

      this.setStatusTyping(true);

      try {
        let response;
        let attempt = 0;

        while (attempt < maxAttempts) {
          const isInternal = window.location.href.includes('/internal/') || window.location.href.includes('/crm');
          const apiEndpoint = isInternal
            ? $api.backend.conversation['internal-message']
            : $api.backend.conversation.message;

          response = await apiEndpoint.makeRequest({
            method: "post",
            data: {
              ...messageObject,
              stream: true,
            },
          });

          if (response.status === 200) {
            break;
          } else if (response.status === 401 || response.status === 403) {
            if (attempt === maxAttempts) {
              this.setStatusTyping(false);
              throw new Error("Failed to fetch token from the server");
            }
            attempt++;
            await botHelper.refreshToken(this);
          } else {
            this.setStatusTyping(false);
            throw new Error("Failed to fetch response from the server");
          }
        }

        const conversation_id = this.session.conversationId;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let prevTextAnswer;

        // const debouncedProcessMessage = botHelper.debounce(
        //   botHelper.processMessage,
        //   100
        // );

        let partial_json = "";
        const stream_done = false;
        while (!stream_done) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk_potentially_in_bulk = decoder.decode(value, {
            stream: true,
          });

          // Sometimes the splitting creates an empty strings that we want to remove
          const chunk_list = chunk_potentially_in_bulk
            .split("%%%")
            .filter((part) => part !== "");

          for (const chunk of chunk_list) {
            let data;

            try {
              if (partial_json == "") {
                data = JSON.parse(chunk);
              } else {
                // Sometimes chunk of the JSON chunks arrives. We concat the part and wait until we can complete the JSON, even if it's in the next reader's chunk
                data = JSON.parse(partial_json + chunk);
                // Succeeded to parse partial_json, reset it.
                partial_json = "";
              }
            } catch (err) {
              partial_json += chunk;
              continue;
            }
            // Skip empty messages unless they're form bubbles (which intentionally have no text)
            if (!data.text_answer && !data.is_form_bubble) {
              continue;
            }
            // For non-form messages, fall back to previous text_answer if empty
            if (
              !data.is_form_bubble &&
              (!Object.keys(data).includes("text_answer") ||
              data.text_answer == "")
            ) {
              data["text_answer"] = prevTextAnswer;
            }
            // debouncedProcessMessage({
            //   data,
            //   store: this,
            //   message_id,
            // });

            // Backend must provide message_id for each event
            // Different message_ids create separate bubbles (multi-bubble UX)
            // Same message_id updates existing bubble (token streaming)
            const message_id = data.message_id;

            botHelper.processMessage({
              data,
              store: this,
              message_id,
              conversationId: conversation_id
            });
            prevTextAnswer = data.text_answer;
          }
        }
        this.setStatusTyping(false);
      } catch (err) {
        const metadata = {
          message_id,
          inventory,
          tags,
        };
        telemetry
          .error(err, metadata)
          .then(() => {
            this.responseWithErrorMessage();
          });
      }
    },

    async clearConversation() {
      let attempt = 0;
      while (attempt < maxAttempts) {
        try {
          let res = await $api.backend.conversation.clear.makeRequest({
            method: "post",
            data: {
              text: "Start a new conversation",
              message_id: uuidv7(),
              session_id: this.session.sessionId,
              conversation_id: this.session.conversationId,
              campaign_id: this.botParameters.campaignId,
              inventory: this.session.urlParams.inventory,
              tags: this.session.urlParams.tags,
              collected_infos: {
                ...this.dynamicForms.contactForm.data,
                ...this.dynamicForms.localeForm.data,
                ...this.dynamicForms.emailOnlyForm?.data,
              },
            },
          });

          if (res.status == 200) {
            break;
          }
        } catch (err) {
          if (
            err.response &&
            (err.response.status === 401 || err.response.status === 403)
          ) {
            if (attempt === maxAttempts) {
              throw new Error("Failed to fetch token from the server");
            }
            attempt++;
            await botHelper.refreshToken(this);
          } else {
            break;
          }
        }
      }
    },

    async verifyCFlareTurnstile(payload) {
      try {
        const res = await $api.proxy.verifyCFlareTurnstile.makeRequest({
          method: "post",
          data: payload,
          params: {
            action: "verify_cf_turnstile",
          },
        });
        if (res.status == 200) {
          return res;
        }
      } catch (err) {
        return err;
      }
    },

    async fetchRecommendationData() {
      // ! DEPRECATED
      // TODO: this is Wordpress specific, we need to find a way to make it more generic
      try {
        const res = await $api.proxy.fetchRecommendationData.makeRequest({
          method: "post",
          params: {
            action: "get_chatbot_recommendations",
            campaign_id: this.botParameters.campaignId,
            // TODO: retrieve the qty from proxy chatbot settings
            qty: 8,
          },
        });
        if (res.status == 200) {
          const data = {
            text_answer: res.data.answer,
            items: res.data.items,
          };
          const message_id = uuidv7();
          botHelper.processMessage({
            data,
            store: this,
            message_id,
          });
          this.setStatusTyping(false);
        }
      } catch (err) {
        this.setStatusTyping(false);
        return err;
      }
    },

    async addToCart(payload) {
      try {
        const res = await $api.proxy.addToCart.makeRequest({ params: payload });
        if (res.status == 200) {
          return res;
        }
      } catch (err) {
        return err;
      }
    },

    async actionExecuteBackend({ url, params }) {
      let res;
      let attempt = 0;

      while (attempt < maxAttempts) {
        try {
          res = await $api.backend.action.makeRequest({
            method: "post",
            url,
            data: {
              text: "", // TODO: make it an Optional[str] initialized to None in the model constructor in gpt backend
              conversation_id: this.session.conversationId,
              campaign_id: this.botParameters.campaignId,
              message_id: uuidv7(),
              session_id: this.session.sessionId,
              action: {
                params: withActionAttribution(url, params, getGlobalLocale()),
              },
              collected_infos: {
                ...this.dynamicForms.contactForm.data,
                ...this.dynamicForms.localeForm.data,
                ...this.dynamicForms.emailOnlyForm?.data,
              },
            },
            // acceptLanguage: this.botLocale,
          });
          return res;
        } catch (err) {
          if (
            err.response &&
            (err.response.status === 401 || err.response.status === 403)
          ) {
            if (attempt === maxAttempts) {
              throw new Error("Failed to fetch token from the server");
            }
            attempt++;
            await botHelper.refreshToken(this);
          } else {
            throw new Error("Failed to fetch response from the server");
          }
        }
      }
    },

    removeItemFromCart({ messageIndex, optionIndex, itemId }) {
      const message = this.messages.data[messageIndex];
      if (!message || !message.metadata.items) return;

      // Remove the item from options
      message.metadata.items.splice(optionIndex, 1);

      // Update ALL message-level actions that have item_identifiers
      if (message.actions) {
        Object.keys(message.actions).forEach(actionKey => {
          const action = message.actions[actionKey];
          if (action.backend_params && action.backend_params.item_identifiers) {
            const identifiers = action.backend_params.item_identifiers;
            const index = identifiers.indexOf(itemId);
            if (index > -1) {
              identifiers.splice(index, 1);
            }
          }
        });
      }

      // Also remove from individual item actions if they exist
      message.metadata.items.forEach(option => {
        if (option.actions) {
          Object.keys(option.actions).forEach(actionKey => {
            const action = option.actions[actionKey];
            if (action.backend_params && action.backend_params.item_identifiers) {
              const identifiers = action.backend_params.item_identifiers;
              const index = identifiers.indexOf(itemId);
              if (index > -1) {
                identifiers.splice(index, 1);
              }
            }
          });
        }
      });
    },

    // Paginated search: clear items for a message (used when re-sorting)
    clearMessageItems(messageId) {
      const message = this.messages.data.find((m) => m.id === messageId);
      if (message) {
        message.metadata.items = [];
      }
    },

    // Paginated search: track which item IDs the user has seen
    addSeenItemIds(itemIds) {
      for (const id of itemIds) {
        if (!this.seenItemIds.includes(id)) {
          this.seenItemIds.push(id);
        }
      }
    },

    // Paginated search: fetch next page of results
    async fetchSearchPage({ searchId, page, sort, direction, messageId }) {
      const maxAttempts = 3;
      let attempt = 1;

      while (attempt <= maxAttempts) {
        try {
          const conversationId = this.session.conversationId;
          const params = new URLSearchParams({
            conversation_id: conversationId,
            page: String(page),
          });
          if (sort) params.append("sort", sort);
          if (direction) params.append("direction", direction);

          const res = await $api.backend.search.makeRequest({
            url: `${searchId}?${params.toString()}`,
          });

          if (res.status === 200) {
            const data = res.data;

            // Find the message and append items
            const message = this.messages.data.find((m) => m.id === messageId);
            if (message && data.items?.elements) {
              const locale = getGlobalLocale();
              const newItems = data.items.elements.map((item) => ({
                sku: item.sku || item.item_id,
                name: item.name,
                brand: null,
                price: item.price,
                actions: botHelper.formatActions(item.actions, locale),
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
              }));
              message.metadata.items.push(...newItems);
              message.has_more = data.has_more;
              message.total_count = data.total_count;

              // Track newly seen items
              this.addSeenItemIds(newItems.map((item) => item.item_id));
            }

            return data;
          }
        } catch (err) {
          if (
            err.response &&
            (err.response.status === 401 || err.response.status === 403)
          ) {
            if (attempt === maxAttempts) {
              console.error("[fetchSearchPage] Auth failed after retries");
              return null;
            }
            attempt++;
            await botHelper.refreshToken(this);
          } else {
            console.error("[fetchSearchPage] Failed:", err);
            return null;
          }
        }
      }
      return null;
    },

    createConversation({ agent_id, tenant_id, status = "active", tags = [] } = {}) {
      const conversationId = this.session.conversationId || uuidv7();

      // Check if conversation already exists for this session
      const existingConversation = this.conversations.find(conv => conv.id === conversationId);
      if (existingConversation) {
        return existingConversation;
      }

      const newConversation = {
        id: conversationId,
        agent_id: agent_id || uuidv7(),
        started_at: new Date().toISOString(),
        ended_at: null,
        status,
        tenant_id: tenant_id || "",
        tags
      };

      this.conversations.unshift(newConversation);
      return newConversation;
    },

    setEmailCaptureTracking(payload) {
      this.emailCaptureTracking = {
        ...this.emailCaptureTracking,
        ...payload,
      };
    },

    markExitIntentShown() {
      this.emailCaptureTracking.exitIntentShown = true;
    },

    markFormDismissed() {
      this.emailCaptureTracking.formDismissed = true;
    },

    setFloatingBubblesDismissed(value) {
      this.floatingBubblesDismissed = value;
    },

    /**
     * Fetch forms configuration from backend and merge with defaults
     * @param {string} tenantName - The tenant name (e.g., "sothebys-realty-mu")
     */
    async fetchFormsConfig(tenantName) {
      try {
        const response = await $api.backend.tenants.makeRequest({
          method: "get",
          url: `${tenantName}/forms`,
        });

        if (response.status === 200 && response.data) {
          /** @type {import('@/types/forms-api').FormsConfigResponse} */
          const backendForms = response.data;
          this.applyBackendForms(backendForms);
          console.log("[Bot Store] Forms loaded from backend:", Object.keys(backendForms.forms || {}));
        }
      } catch (error) {
        console.warn("[Bot Store] Failed to fetch forms from backend, using defaults:", error.message);
        // Continue with default forms - this is not a critical error
      }
    },

    /**
     * Merge backend forms configuration with existing dynamic forms
     * Uses mergeBackendForms from formConfigs to attach submit handlers
     * @param {import('@/types/forms-api').FormsConfigResponse} backendForms - Forms config from backend
     */
    applyBackendForms(backendForms) {
      if (!backendForms || !backendForms.forms) return;

      // Use formConfigs merger to add submit handlers to backend forms
      const formsWithHandlers = mergeBackendForms(backendForms);

      // Merge each form with existing form data
      Object.entries(formsWithHandlers).forEach(([formName, formConfig]) => {
        const existingData = this.dynamicForms[formName]?.data || null;
        this.dynamicForms[formName] = {
          ...formConfig,
          data: existingData,
        };
      });

      // Store exit_intent and buttons config in botParameters for component access
      if (backendForms.exit_intent) {
        this.botParameters.exitIntent = backendForms.exit_intent;
      }
      if (backendForms.buttons) {
        this.botParameters.formButtons = backendForms.buttons;
      }

      console.log("[Bot Store] Backend forms merged successfully");
    },

    /**
     * Get form configuration by name
     * @param {string} formName - The form name
     * @returns {object|null} - The form configuration or null
     */
    getFormConfig(formName) {
      return this.dynamicForms[formName] || null;
    },
  },
});
