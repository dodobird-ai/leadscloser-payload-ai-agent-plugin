<!-- ! DEPRECATED -->
<template lang="pug">
.bubble-btn-component.bubble-btn-component--button-options    
  .bubble-btn-component__text(v-html="message.text")
  .bubble-btn-component__options-wrapper
    .mb-button-options__item(
      v-for="(item, index) in message.options",
      :class="{ active: selectedItem === item.value }",
      :key="index"
    )
      button.mb-button-options__btn(
        @click="item.action === 'postback' ? selectOption(item) : openLink(item)"
        :disabled="disableInput"
      )
        span {{ item.text }}
</template>
<script>
import { mapState } from "pinia";
import { useBotStore } from "@/store/bot";
export default {
  props: {
    message: {
      type: Object,
    },
    messageIndex: {
      type: Number,
    },
  },

  data() {
    return {
      selectedItem: null,
      disableInput: false,
    };
  },

  computed: {
    ...mapState(useBotStore, ["messagesData"]),
  },

  watch: {
    messagesData: {
      handler() {
        if (!this.checkIfLastMessage()) {
          this.disableInput = true;
        }
      },
      deep: true,
    },
  },

  mounted() {
    if (!this.checkIfLastMessage()) {
      this.disableInput = true;
    }
  },

  methods: {
    selectOption(value) {
      this.selectedItem = value;
      this.$emit("msg-send", { text: value.text });
    },
    checkIfLastMessage() {
      return this.messageIndex === this.messagesData.length - 1;
    },
    openLink(item) {
      window.open(item.value, "_blank");
    },
  },
};
</script>

<style lang="scss">
.bubble-btn-component table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ccc;
}

.bubble-btn-component th,
.bubble-btn-component td {
  padding: 8px;
  border: 1px solid #ccc;
}

.bubble-btn-component th {
  background-color: #f2f2f2;
}

.bubble-btn-component tbody tr:nth-child(even) {
  background-color: #f2f2f2;
}
</style>
