<template lang="pug">
//- Use same wrapper structure as BotSuggestions for consistent styling
.bubble-btn-component.bubble-btn-component--single-text
  InlineForm(
    v-for="inlineAction in inlineActions"
    :key="inlineAction.key"
    :form-name="getFormName(inlineAction.actionObjValues.prerequisite)"
    :pending-action="inlineAction"
    :action-text="inlineAction.actionObjValues.frontend_params.text"
    :is-completed="completedInlineActions.has(inlineAction.key)"
    @form-completed="onInlineFormCompleted(inlineAction.key)"
  )
</template>

<script>
import InlineForm from "./InlineForm.vue";

export default {
  name: "FormOnlyBubble",
  components: {
    InlineForm,
  },
  props: {
    message: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      completedInlineActions: new Set(),
    };
  },
  computed: {
    inlineActions() {
      if (!this.message.actions) return [];
      return Object.keys(this.message.actions).map((actionKey) => ({
        key: actionKey,
        actionObjValues: this.message.actions[actionKey],
        urlParam: actionKey,
        frontendParams: this.message.actions[actionKey].frontend_params,
        backendParams: this.message.actions[actionKey].backend_params,
      }));
    },
  },
  methods: {
    getFormName(prerequisite) {
      if (!prerequisite) return "contactForm";
      const name =
        typeof prerequisite === "string" ? prerequisite : prerequisite.name;
      return name === "collect_infos" ? "contactForm" : name;
    },
    onInlineFormCompleted(actionKey) {
      this.completedInlineActions.add(actionKey);
    },
  },
};
</script>

<style scoped>
/* Override InlineForm's margin-top since this IS the bubble content */
.bubble-btn-component :deep(.inline-form) {
  margin-top: 0;
}
</style>
