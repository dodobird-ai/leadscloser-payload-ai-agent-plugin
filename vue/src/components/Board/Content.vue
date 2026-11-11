<template lang="pug">
.board-content(
  ref="boardContent" 
  :data-campaign="botParameters.campaignId" 
  element-loading-background="white"
  )
  .board-content__bubbles(ref="boardBubbles" v-if="cfStatus.verified")
    message-bubble(
      v-for="(item, index) in messagesDataForCurrentConversation",
      :key="index",
      :message="item",
      :messageIndex = "index"
      @msg-send="handleSendMessage"
      @close-bot="handleCloseBot"
    )
    .board-content__bot-typing(v-if="statusTyping")
      slot(name="botTyping")
        message-typing
  .board-content__robot-detected(v-else)
    .board-content__robot-detected__content.m-3
      .board-content__robot-detected__content__title
        h3 Access Denied
      .board-content__robot-detected__content__description
        p
          | Unfortunately, we could not verify that you are a human. 
          | Access to the chatbot is restricted. Please try reloading the page and completing the security check again.
</template>

<script>
import MessageBubble from "../MessageBubble/Main";
import MessageTyping from "../MessageBubble/Typing";
import { mapState } from "pinia";
import { vLoading } from "element-plus";
import { useBotStore } from "@/store/bot";

export default {
  name: "ContentComponent",
  directives: {
    loading: vLoading,
  },
  components: {
    MessageBubble,
    MessageTyping,
  },
  data() {
    return {};
  },
  // provide() {
  //   return { updateScroll: this.updateScroll };
  // },
  watch: {
    messagesDataForCurrentConversation: {
      handler: function () {
        if (this.skipAutoScroll) return;
        this.$nextTick(() => {
          this.updateScroll();
        });
      },
      deep: true
    },
    statusTyping: {
      handler: function (newVal) {
        if (newVal) {
          this.$nextTick(() => {
            this.updateScroll();
          });
        }
      }
    },
    statusActive: {
      handler: function (newVal) {
        if (newVal) {
          this.$nextTick(() => {
            this.updateScroll();
          });
        }
      }
    }
  },
  computed: {
    ...mapState(useBotStore, [
      'statusTyping',
      'cfStatus',
      'statusActive',
      'botParameters',
      'messagesDataForCurrentConversation'
    ]),
    skipAutoScroll() {
      return useBotStore().status.skipAutoScroll;
    }
  },
  methods: {
    updateScroll(behavior = "smooth") {
      if (this.$refs.boardBubbles) {
        const contentElm = this.$refs.boardContent;
        const offsetHeight = this.$refs.boardBubbles.offsetHeight;
        contentElm.scrollTo({ top: offsetHeight, behavior: behavior });
      }
    },
    handleSendMessage(data) {
      this.$emit("msg-send", data);
    },
    handleCloseBot() {
      this.$emit("close-bot");
    },
  },
  mounted() {
    if (this.statusActive) this.updateScroll();
  },
};
</script>
