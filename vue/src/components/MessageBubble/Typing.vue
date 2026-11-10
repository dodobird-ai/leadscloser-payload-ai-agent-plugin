<template lang="pug">

.bubble-btn-component.bubble-btn-component--typing
  .bubble-btn-component__text
    .bot-msg-bubble__typing-indicator-container
      BotLoader
 
</template>
<script>
import BotLoader from "./BotLoader";

export default {
  name: "MessageTyping",
  components: {
    BotLoader,
  },
};
</script>
