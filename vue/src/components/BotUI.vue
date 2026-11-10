<template lang="pug">
.chatbot-container(:class="[...uiClasses, { 'chat': (urlParams.fullscreen || statusSmallScreen && !botParameters.preview) }]" :id="'dodo-content-' + generateUniqueId()" data-type="dodochatbot")
  //- TODO: check the uiClasses and transition used in the original code
  transition(name="bot-fadeUp")
  vue-turnstile(v-if="!skipCaptcha" :site-key="cf_site_key" v-model="cf_token" @error="handleTurnstileError()")
  .bot-board(:aria-hidden="!statusActive ? 'true' : 'false'" :class="{ 'side-panel': statusSidebar }, { 'chat': urlParams.fullscreen }, { 'hidden': !statusActive }")
    BoardHeader(
      @close-bot="botToggle"
      @fullscreen-bot="fullscreenToggle"
      @toggle-position="togglePosition"
    )
    div(class="d-flex flex-column " style="position: relative; flex: 1 1 auto; overflow-y: auto;")
      // button(v-if="!statusSmallScreen && botParameters.view === 'both'" @click="togglePosition" class="position-toggle" aria-label="Change chat position")
      //   span(v-if="statusSidebar") {{ $t("btn.chatbotView") }}
      //   span(v-else) {{ $t("btn.sidebarView") }}
      BoardContent(
        v-if="statusChatMode"
        ref="boardContent"
        @msg-send="handleSendMessage"
        @close-bot="botToggle"
      )
      BoardRecentChats(v-else @start-new-chat="startNewChat")
      div(v-if="!botParameters.preview && statusChatMode")
        BoardInputSuggestion(
          :start-input-suggestions="startInputSuggestions"
          @add-text-to-input="addTextToInputBox"
          @type-anything="inputFocus"
          @send-feedback="addFeedbackToInputBox"
          @send-suggestion="handleSendMessage"
        )
        BoardAction(
          ref="boardAction"
          @msg-send="handleSendMessage"
          @start-new-chat="startNewChat"
        )
      BoardDisclaimer
      PopupForm(v-if="!botParameters.preview" :class="[{ 'active': dynamicForms.show }, { 'chat': urlParams.fullscreen || statusSmallScreen }]")
      ExitIntentModal(
        v-if="!botParameters.preview"
        :show="showExitIntentModal"
        @close-modal="showExitIntentModal = false"
        @confirm-close="confirmClose"
      )
  .bot-bubble(aria-controls="chatbot-sidebar")
    button.bot-bubble-btn(
      v-if="!statusActive && !statusSmallScreen"
      @click="botToggle"
      aria-label="Open chatbot"
    )
      bubble-icon.bot-bubble-btn-icon(v-if="!botParameters.featuredImage")
      img.bot-bubble-btn-icon(v-else :src="botParameters.featuredImage" )
  FloatingBubbles(@bubble-click="handleFloatingBubbleClick" :is-mobile-typing="isMobileInputTyping")
  MobileFloatingInput(@submit="handleMobileInputSubmit" @typing="handleMobileInputTyping")
  AppStyle
</template>

<script>
import { mapState, mapActions } from "pinia";
import Cookies from "js-cookie";
import { uuidv7 } from "uuidv7";
import VueTurnstile from "vue-turnstile";

import AppStyle from "./AppStyle";
import BoardHeader from "./Board/Header";
import BoardContent from "./Board/Content";
import BoardInputSuggestion from "./Board/InputSuggestion";
import BoardAction from "./Board/Action";
import BoardDisclaimer from "./Board/Disclaimer";
import PopupForm from "./PopupForm";
import ExitIntentModal from "./ExitIntentModal.vue";
import BubbleIcon from "./Icons/Bubble.vue";
import { useBotStore } from "@/store/bot";
import { setGlobalLocale } from "@/i18n";
import { geolocationService } from "@/services/geolocation";
import BoardRecentChats from './Board/RecentChats.vue';
import FloatingBubbles from './Board/FloatingBubbles.vue';
import MobileFloatingInput from './Board/MobileFloatingInput.vue';

export default {
  name: "VueBotUI",
  components: {
    BoardHeader,
    BoardContent,
    BoardInputSuggestion,
    BoardAction,
    BoardDisclaimer,
    BubbleIcon,
    AppStyle,
    VueTurnstile,
    PopupForm,
    ExitIntentModal,
    BoardRecentChats,
    FloatingBubbles,
    MobileFloatingInput
  },
  data() {
    return {
      cf_site_key: '',
      cf_token: '',
      startInputSuggestions: true, // Keep for initial display toggle only
      pendingFloatingQuestion: null, // Store question to auto-submit after locale form
      isScrollLocked: false, // Track scroll lock state
      showExitIntentModal: false, // Control exit intent modal visibility
      isMobileInputTyping: false // Track if user is typing in mobile input
    };
  },
  computed: {
    ...mapState(useBotStore, [
      'statusActive',
      'statusSidebar',
      'dynamicForms',
      'botParameters',
      'urlParams',
      'statusSmallScreen',
      'statusChatMode',
      'session',
      'messagesDataForCurrentConversation',
      'hasUserEmail',
      'emailCaptureTracking'
    ]),

    uiClasses() {
      let classes = [];
      classes.push("bot-ui--animate");
      return classes;
    },
    skipCaptcha() {
      return (
        this.botParameters.preview
      );
    },
  },
  created() {
    this.setCfStatus("verified", Boolean(this.skipCaptcha));

    if (this.isOpen) {
      this.openDelay
        ? setTimeout(this.botOpen, this.openDelay)
        : this.botToggle();
    }
  },
  mounted() {
    this.setUrlParams();
    this.initializeBot();

    // Initialize viewport manager
    if (this.$viewportManager && this.statusSmallScreen) {
      this.$viewportManager.storeOriginalViewport();
    }
    if (
      this.botParameters.view === "sidebar" ||
      this.botParameters.view === "both"
    ) {
      const sidebar = document.getElementById("chatbot-sidebar");
      if (this.statusActive && this.statusSidebar) {
        sidebar.classList.remove("hidden");
      } else {
        sidebar.classList.add("hidden");
      }
    }
    let scrollTimeout;
    const botBoard = document.querySelector(".bot-board");

    const enableScrollLock = () => {
      if (!this.isScrollLocked && this.statusActive) {
        this.isScrollLocked = true;
        this.$root.toggleBodyScroll(true);
      }
    };

    const disableScrollLock = () => {
      if (this.isScrollLocked) {
        this.isScrollLocked = false;
        this.$root.toggleBodyScroll(false);
      }
    };

    botBoard.addEventListener("mouseenter", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(enableScrollLock, 500); // Increased delay
    });

    botBoard.addEventListener("mouseleave", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(disableScrollLock, 200); // Shorter delay for leave
    });

    window.bot_parameters.statusActive = this.statusActive;
    window.bot_parameters.botToggle = this.botToggle.bind(this);
    window.bot_parameters.sendMessage = this.handleSendMessage.bind(this);
    window.bot_parameters.handleReplaceMessageData =
      this.replaceMessagesData.bind(this);

    window.bot_parameters.setConversations = this.setConversations.bind(this);
    window.bot_parameters.setStatusChatMode = this.setStatusChatMode.bind(this);
  },
  watch: {
    cf_token(newToken) {
      newToken && this.verifyToken();
    },
    'dynamicForms.show'(isShowing, wasShowing) {
      // Watch for when the form is dismissed (show goes from true to false)
      // This indicates the user clicked submit, not just data loading from localStorage
      console.log('dynamicForms.show changed:', { isShowing, wasShowing, pending: this.pendingFloatingQuestion });

      // If form was showing and now it's hidden, and we have a pending question
      if (wasShowing && !isShowing && this.pendingFloatingQuestion) {
        console.log('✅ Form was submitted (show: true → false), auto-submitting question:', this.pendingFloatingQuestion);
        this.$nextTick(() => {
          this.handleSendMessage(this.pendingFloatingQuestion);
          this.pendingFloatingQuestion = null; // Clear the pending question
        });
      }
    },
  },
  beforeUnmount() {
    // Restore original viewport when component is destroyed
    if (
      this.$viewportManager &&
      this.$viewportManager.isManaged &&
      this.statusSmallScreen
    ) {
      this.$viewportManager.restoreViewport();
    }
  },
  methods: {
    ...mapActions(useBotStore, [
      'setStatusChatMode',
      'setConversations',
      'toggleStatusActive',
      'toggleStatusSidebar',
      'setConversationId',
      'setMessagesData',
      'sendMessage',
      'fetchRecommendationData',
      'verifyCFlareTurnstile',
      'pushMessagesBufferMessages',
      'setCfStatus',
      'setSessionId',
      'setUniqueUserId',
      'setBotParameters',
      'toggleDynamicForm',
      'setUrlParams',
      'setUrlParamsData',
      'replaceMessagesData',
      'setStatusActive',
      'setGeolocationNationality',
      'createConversation',
      'clearConversation'
    ]),

    initializeBot() {
      this.setBotOptions();
      if (!this.botParameters.preview) {
        this.setSessionId(Cookies.get(this.$dodoCookies.session));
        this.setUniqueUserId(Cookies.get(this.$dodoCookies.user).split(".")[0]);
      }
      this.autoFetchRecommendation();
      this.$root.toggleBodyScroll(
        this.statusActive &&
          (this.urlParams.fullscreen || this.statusSmallScreen)
      );
      this.urlParams.fullscreen &&
        !this.statusActive &&
        (() => {
          this.botToggle();
          this.botStart();
        })();
      if (this.statusActive) this.botStart();
    },

    setBotOptions() {
      this.setBotParameters(window.bot_parameters || {});
      this.loadNationality();

      const { cfSiteKey, locale, view } = this.botParameters;
      this.cf_site_key = cfSiteKey;
      if (view === "sidebar" && !this.statusSidebar) this.toggleStatusSidebar();

      setGlobalLocale(
        this.dynamicForms.localeForm.data
          ? this.dynamicForms.localeForm.data.language
          : locale
      );
      if (this.botParameters.preview) this.setStatusActive(true);
    },
    autoFetchRecommendation() {
      // ! DEPRECATED
      // TODO: make the validCartOrProductPage dynamic
      const validCartOrProductPage =
        (window.location.pathname.startsWith("/cart") ||
          window.location.pathname.match(/^\/product\/.*\/?$/)) &&
        document.title !== "Page not found – DodoShop";
      const enableAutoFetch =
        this.botParameters.autoFetchRecommendation === "on" &&
        validCartOrProductPage;
      if (enableAutoFetch) {
        if (this.messagesData.length === 0) this.setConversationId(uuidv7());

        this.timeoutId = setTimeout(() => {
          !this.statusActive &&
            this.fetchRecommendation().then(() => this.botToggle());
        }, 25000);
      }
    },
    botStart() {
      if (!this.statusChatMode) this.setStatusChatMode(true);
      if (!this.messagesDataForCurrentConversation.length > 0) this.toggleDynamicForm('localeForm');
    },
    async startNewChat() {
      if (this.messagesDataForCurrentConversation.length > 1 && !this.statusTyping) {
        // ! add loader
        // this.loading.clearConversation = true;
        await this.clearConversation();
        // this.loading.clearConversation = false;
        this.toggleDynamicForm('localeForm');
        this.botStart();
      }
    },
    async botToggle() {
      // Check if we should show exit intent modal when closing
      if (this.statusActive && !this.hasUserEmail && !this.emailCaptureTracking.exitIntentShown) {
        // User is trying to close without providing email
        this.showExitIntentModal = true;
        return; // Don't close yet, wait for user response
      }

      this.toggleStatusActive();
      // To sync frontend statusActive with proxy
      window.bot_parameters.statusActive = this.statusActive;

      // Handle viewport zoom prevention on mobile
      if (this.$viewportManager && this.statusSmallScreen) {
        if (this.statusActive) {
          // Chatbot is opening - prevent zoom
          this.$viewportManager.preventZoom();
        } else {
          // Chatbot is closing - restore original viewport
          this.$viewportManager.restoreViewport();
        }
      }

      !this.statusActive &&
        this.urlParams.fullscreen &&
        this.fullscreenToggle();

      const sidebar = document.getElementById("chatbot-sidebar");
      if (this.statusSidebar) {
        sidebar.classList.toggle("hidden");
      }

      // Handle body scroll lock
      const shouldLockScroll = this.statusActive &&
          (this.urlParams.fullscreen || this.statusSmallScreen);

      this.$root.toggleBodyScroll(shouldLockScroll);

      // Reset scroll lock flag when closing bot to ensure consistency
      if (!this.statusActive) {
        this.isScrollLocked = false;
      }

      this.botStart();
    },
    confirmClose() {
      // User confirmed they want to close without leaving email
      this.toggleStatusActive();
      window.bot_parameters.statusActive = this.statusActive;

      // Handle viewport
      if (this.$viewportManager && this.statusSmallScreen) {
        this.$viewportManager.restoreViewport();
      }

      if (this.urlParams.fullscreen) {
        this.fullscreenToggle();
      }

      const sidebar = document.getElementById("chatbot-sidebar");
      if (this.statusSidebar) {
        sidebar.classList.toggle("hidden");
      }

      this.$root.toggleBodyScroll(false);
      this.isScrollLocked = false;
    },
    togglePosition() {
      if (this.urlParams.fullscreen) this.fullscreenToggle();
      const sidebar = document.getElementById("chatbot-sidebar");
      this.toggleStatusSidebar();
      sidebar.classList.toggle("hidden");
    },
    handleSendMessage(value, bufferMode = false) {
      this.startInputSuggestions = false;
      const message_id = uuidv7();
      const messagePayload = {
        id: message_id,
        conversation_id: this.session.conversationId,
        sender_id: null,
        content: value.text ? value.text : value,
        delivered: false,
        viewed: false,
        sent_at: null,
        message_type: "user",
        metadata: {},
        tags: {},
        tenantId: null,
      };
      this.setMessagesData(messagePayload);
      const messageObject = this.messagesDataForCurrentConversation.find(message => message.id === message_id);

      if (bufferMode) this.pushMessagesBufferMessages(messageObject);
      else this.sendMessage([messageObject]);
    },
    fullscreenToggle() {
      this.setUrlParamsData({ fullscreen: !this.urlParams.fullscreen });
      const urlParams = new URLSearchParams(window.location.search);
      this.urlParams.fullscreen
        ? urlParams.set("chatFullscreen", "true")
        : urlParams.delete("chatFullscreen");
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${urlParams}`
      );

      const shouldLockScroll = this.statusActive &&
          (this.urlParams.fullscreen || this.statusSmallScreen);

      this.$root.toggleBodyScroll(shouldLockScroll);

      // Reset scroll lock flag when exiting fullscreen if not needed
      if (!shouldLockScroll) {
        this.isScrollLocked = false;
      }
    },
    async fetchRecommendation() {
      this.fetchRecommendationData();
      this.updateBoardContentScroll();
    },
    async verifyToken() {
      const res = await this.verifyCFlareTurnstile({
        "cf-turnstile-response": this.cf_token,
      });

      if (res.data && res.data.success) {
        this.setCfStatus("verified", true);
      }
      // }
    },
    async handleTurnstileError() {
      this.setCfStatus("verified", false);
    },
    addTextToInputBox(value) {
      this.$refs.boardAction.updateInputText(value);
    },
    inputFocus(value) {
      this.$refs.boardAction.inputFocus(value);
    },
    addFeedbackToInputBox() {
      if (!this.$refs.boardAction.checkTextInputText("/feedback"))
        this.$refs.boardAction.prependInputText("/feedback");
      else this.$refs.boardAction.inputFocus(true);
    },
    updateBoardContentScroll() {
      this.$refs.boardContent.updateScroll();
    },
    generateUniqueId() {
      const uniqid =
        Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      const id = uniqid.slice(-4);
      return id;
    },
    async loadNationality() {
      try {
        const nationality = await geolocationService.getDefaultNationality();
        this.setGeolocationNationality(nationality);
      } catch (error) {
        console.error("Failed to load nationality:", error);
      }
    },
    handleFloatingBubbleClick(questionText) {
      console.log('handleFloatingBubbleClick called with:', questionText);

      // Store the question to be sent after locale form is completed
      this.pendingFloatingQuestion = questionText;

      // Open the bot if not already open
      if (!this.statusActive) {
        this.botToggle();
      }

      // If locale form is already completed (user already selected language before), send immediately
      if (this.dynamicForms.localeForm.data && !this.dynamicForms.show) {
        console.log('Locale form already completed and not showing, sending immediately');
        setTimeout(() => {
          this.handleSendMessage(questionText);
          this.pendingFloatingQuestion = null;
        }, 300);
      } else {
        console.log('Waiting for locale form completion. Show:', this.dynamicForms.show, 'Data:', this.dynamicForms.localeForm.data);
      }
    },
    handleMobileInputSubmit(questionText) {
      console.log('handleMobileInputSubmit called with:', questionText);

      // Store the question to be sent after locale form is completed
      this.pendingFloatingQuestion = questionText;

      // Open the bot if not already open
      if (!this.statusActive) {
        this.botToggle();
      }

      // If locale form is already completed (user already selected language before), send immediately
      if (this.dynamicForms.localeForm.data && !this.dynamicForms.show) {
        console.log('Locale form already completed and not showing, sending immediately');
        setTimeout(() => {
          this.handleSendMessage(questionText);
          this.pendingFloatingQuestion = null;
        }, 300);
      } else {
        console.log('Waiting for locale form completion. Show:', this.dynamicForms.show, 'Data:', this.dynamicForms.localeForm.data);
      }
    },
    handleMobileInputTyping(isTyping) {
      this.isMobileInputTyping = isTyping;
    },
  },
};
</script>

<style src="../assets/scss/_app.scss" lang="scss"></style>
