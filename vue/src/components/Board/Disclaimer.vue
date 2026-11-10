<template lang="pug">
.board-disclaimer
    p.text-center(:class="{'chat': this.urlParams.fullscreen}") {{ $t("text.disclaimer", { botTitle: botParameters.title }) }}
</template>
<script>
import { mapState } from "pinia";
import { useBotStore } from "@/store/bot";
export default {
  name: "DisclaimerComponent",

  computed: {
    ...mapState(useBotStore, ["botParameters", "urlParams"]),
  },
};
</script>
