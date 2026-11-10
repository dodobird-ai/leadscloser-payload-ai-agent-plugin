<template lang="pug">
.board-input-suggestion
  .bubble-btn-component__questions-wrapper
      .mb-question-item(
        v-if="startInputSuggestions" v-for="button in currentButtons" :key="button.id" @click="handleButtonClick(button)"
      )
        p.mb-question-item__text.my-0 {{ button.text[locale] }}
        .mb-question-item__arrow
          ElIcon(size="large" :color="botParameters.primaryColor")
            Top 
      .mb-question-item(
        v-if="!startInputSuggestions && lastMessagesData && lastMessagesData.suggestions" v-for="suggestion in lastMessagesData.suggestions" @click="handleSuggestionClick(suggestion)"
      )
        .mb-question-item__text {{ suggestion }}
        .mb-question-item__arrow ↑
      //- ElButton.mb-button-options__btn.reverse.m-0(
      //-   v-if="currentButtons.length && startInputSuggestions" @click="$emit('type-anything', true)" 
      //- ) ✨ {{ $t("btn.typeAnything") }}
      //- ElButton.mb-button-options__btn.reverse.m-0(
      //-   v-if="botParameters.maintenanceMode === 'on'" @click="$emit('send-feedback')" 
      //- ) 📝 {{ $t("btn.sendFeedback") }}
      //- ElButton.mb-button-options__btn.reverse.m-0(
      //-   v-if='messagesData.length > 1'
      //-   @click="handleClearConversation()" :class="actionClass" :disabled="statusTyping" :loading="loading.clearConversation"
      //- ) {{ loading.clearConversation ? $t("btn.loading") : '🔄 ' + $t("btn.newChat") }} 
</template>

<script>
import { ElButton } from "element-plus";
import { mapState, mapActions } from "pinia";
import { useBotStore } from "@/store/bot";
import { ElIcon } from "element-plus";
import { Top } from "@element-plus/icons-vue";

export default {
  name: "InputSuggestionComponent",
  components: {
    ElButton,
    ElIcon,
    Top,
  },
  data() {
    return {
      loading: { clearConversation: false },
    };
  },
  props: {
    startInputSuggestions: {
      type: Boolean,
      default: false,
    },
  },
  watch: {
    inputSuggestionsJSON: {
      handler(newValue) {
        if (newValue && newValue.length > 0) {
          this.initializeStore();
        }
      },
      immediate: true,
    },
  },
  computed: {
    ...mapState(useBotStore, [
      'dynamicForms',
      'consumedInputSuggestionsGroups',
      'availableInputSuggestionsGroups',
      'messagesDataForCurrentConversation',
      'statusTyping',
      'botParameters',
      'inputSuggestionsJSON'
    ]),

    currentButtons() {
      const nextGroup = this.getNextAvailableButtonGroup();
      if (!nextGroup) return [];
      return this.botParameters.inputSuggestionsJSON.filter(
        (button) => button.group_id === nextGroup
      );
    },

    actionClass() {
      const actionClasses = [];

      if (this.statusTyping) {
        actionClasses.push("mb-button-options__btn--disabled");
      }

      return actionClasses;
    },

    lastMessagesData() {
      return this.messagesDataForCurrentConversation[this.messagesDataForCurrentConversation.length - 1];
    },
    locale() {
      return this.dynamicForms.localeForm.data
        ? this.dynamicForms.localeForm.data.language
        : this.$root.$i18n.locale;
    },
  },
  mounted() {},
  methods: {
    ...mapActions(useBotStore, [
      "setAvailableInputSuggestionsGroups",
      "setConsumedInputSuggestionsGroups",
      "pushConsumedInputSuggestionsGroup",
      "clearConversation",
    ]),
    initializeStore() {
      this.setAvailableInputSuggestionsGroups(this.getUniqueGroups());
      this.setConsumedInputSuggestionsGroups([]);
    },
    getUniqueGroups() {
      return [
        ...new Set(
          this.botParameters.inputSuggestionsJSON.map(
            (button) => button.group_id
          )
        ),
      ];
    },
    getNextAvailableButtonGroup() {
      return (
        this.availableInputSuggestionsGroups.find(
          (group) => !this.consumedInputSuggestionsGroups.includes(group)
        ) || null
      );
    },
    handleButtonClick(button) {
      // Get action from button config, default to 'populate_input' for backwards compatibility
      const action = button.action || 'populate_input';

      if (action === 'auto_submit') {
        this.$emit("send-suggestion", button.text[this.locale]);
      } else {
        this.$emit("add-text-to-input", button.text[this.locale]);
      }

      this.pushConsumedInputSuggestionsGroup(button.group_id);
    },
    handleSuggestionClick(suggestion) {
      // TODO UGLY: Backend API should include an 'action' parameter in the suggestions
      // For now, dynamic suggestions from API default to 'auto_submit'
      // Expected format: { text: "suggestion text", action: "auto_submit" | "populate_input" }

      const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.text;
      const action = typeof suggestion === 'object' && suggestion.action ? suggestion.action : 'auto_submit';

      if (action === 'auto_submit') {
        this.$emit("send-suggestion", suggestionText);
      } else {
        this.$emit("add-text-to-input", suggestionText);
      }
    },
    async handleClearConversation() {
      this.$emit('start-new-chat');
    }
  }
};
</script>
