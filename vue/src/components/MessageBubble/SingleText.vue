<template lang="pug">
.bubble-btn-component.bubble-btn-component--single-text
  .bubble-btn-component__text
    p(v-html="message.text") 
</template>
<script>
export default {
  props: {
    message: {
      type: Object,
    },
  },
};
</script>
