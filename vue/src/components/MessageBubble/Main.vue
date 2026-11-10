<template lang="pug">
.bubble-btn(:class="bubbleClass")
  .bubble-btn__icon-container(v-if="message.message_type === 'bot'")
    ChatBotIcon.bubble-btn__chatbot-icon
  .bubble-btn__content-container
    component(
      v-if="componentType",
      :is="componentType",
      :message="message",
      :message-index="messageIndex"
      v-on="componentListeners"
    )
</template>
<script>
import SingleText from "./SingleText";
import ButtonOptions from "./ButtonOptions";
import BotSuggestions from "./BotSuggestions";
import FormOnlyBubble from "./FormOnlyBubble";
import ChatBotIcon from "../Icons/ChatBot";

export default {
  name: "MessageBubble",
  components: {
    SingleText,
    ButtonOptions,
    BotSuggestions,
    FormOnlyBubble,
    ChatBotIcon,
  },
  props: {
    message: {
      type: Object,
    },
    messageIndex: {
      type: Number,
    },
  },

  computed: {
    bubbleClass() {
      return this.message.message_type === "bot"
        ? "bubble-btn--bot"
        : "bubble-btn--user";
    },

    // Define the message type and return the specific component
    componentType() {
      // Route form-only bubbles (from backend is_form_bubble field)
      // to dedicated component that renders only inline forms
      if (this.message.is_form_bubble) {
        return "FormOnlyBubble";
      }
      return "BotSuggestions";
    },
    componentListeners() {
      if (this.componentType === "ButtonOptions") {
        return {
          "msg-send": this.msgSend,
        };
      }
      if (this.componentType === "BotSuggestions") {
        return {
          "close-bot": this.closeBot,
        };
      }
      return {};
    },
  },

  methods: {
    // * Only applied for ButtonOptions component
    msgSend(data) {
      this.$emit("msg-send", data);
    },
    // * Applied for BotSuggestions component
    closeBot() {
      this.$emit("close-bot");
    },
  },
};
</script>
