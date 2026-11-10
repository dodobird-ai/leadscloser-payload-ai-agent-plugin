<template lang="pug">
.board-action(
  :class="actionClass"
)
  .board-action__wrapper
    .board-action__extra
      button.action-item.action-item--new-chat(
        :disabled='messagesDataForCurrentConversation.length <= 1'
        @click="$emit('start-new-chat')"
      )
        span.plus-icon +
    .board-action__msg-box
      ElInput.board-action__input(
        v-model="messageText",
        type="textarea",
        :autosize="{ minRows: 1, maxRows: 5 }",
        ref="qkbMessageInput",
        :placeholder="$t('placeholder.typeMessage')",
        @keydown.enter.exact="handleSendMessage",
        @input="onInput",
      )
    .board-action__extra
      slot(name="actions")
      button.action-item.action-item--send(
        @click="handleSendMessage"
        :disabled="!messageText.trim()"
        :style="{ backgroundColor: messageText.trim() ? botParameters.primaryColor : '#e5e7eb' }"
      )
        span.arrow ↑
</template>
<script>
import { mapState, mapActions } from 'pinia';
import { ElInput, ElButton, ElIcon } from 'element-plus';
import IconSend from '../Icons/Send.vue';
import NewConversationIcon from '../Icons/NewConversation.vue';
import { useBotStore } from '@/store/bot';
import { IconMessageCirclePlus } from '@tabler/icons-vue';

export default {
  name: "ActionComponent",
  components: {
    IconSend,
    NewConversationIcon,
    ElInput,
    ElButton,
    ElIcon,
    IconMessageCirclePlus
  },

  data() {
    return {
      messageText: "",
      bufferTimer: 0,
    };
  },

  // watch: {
  //   "dynamicForms.localeForm.isCompleted": {
  //     handler(newValue) {
  //       if (newValue) {
  //         this.handleSendMessage();
  //       }
  //     },
  //   },
  // },

  computed: {
    ...mapState(useBotStore, [
      'statusTyping',
      'consumedInputSuggestionsGroups',
      'messagesBuffer',
      'cfStatus',
      'dynamicForms',
      'botParameters',
      'messagesDataForCurrentConversation'
    ]),

    actionClass() {
      const actionClasses = [];
      if (!this.cfStatus.verified || this.statusTyping) {
        actionClasses.push("board-action--disabled");
      }

      if (this.messageText) {
        actionClasses.push("board-action--typing");
      }

      return actionClasses;
    },
  },

  mounted() {},

  methods: {
    ...mapActions(useBotStore, [
      "setConsumedInputSuggestionsGroups",
      "sendMessage",
      "clearMessagesBufferMessages",
      "toggleDynamicForm",
      "clearConversation",
    ]),
    handleSendMessage(event) {
      if (event && event.key === "Enter") event.preventDefault();

      if (this.consumedInputSuggestionsGroups.length > 0)
        this.setConsumedInputSuggestionsGroups([]);
      if (this.messageText && !this.statusTyping) {
        this.$emit("msg-send", { text: this.messageText }, true);
        this.$refs.qkbMessageInput.clear();
      }
    },
    updateInputText(value) {
      if (this.messageText) this.messageText += " " + value.toLowerCase();
      else this.messageText = value;

      this.inputFocus();
    },
    prependInputText(value) {
      this.messageText = value + " " + this.messageText;
      this.inputFocus(true);
    },
    inputFocus() {
      this.$nextTick(() => {
        const input = this.$refs.qkbMessageInput;
        input.focus();
      });
    },
    checkTextInputText(value) {
      return this.messageText.toLowerCase().includes(value.toLowerCase());
    },
    onInput() {
      let { typingDelay, messages } = this.messagesBuffer;
      if (this.bufferTimer) clearTimeout(this.bufferTimer);
      this.bufferTimer = setTimeout(() => {
        if (messages.length > 0) {
          this.sendMessage(messages);
          this.clearMessagesBufferMessages();
        }
      }, typingDelay);
    }
  }
};
</script>
