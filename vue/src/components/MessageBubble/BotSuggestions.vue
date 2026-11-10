<template lang="pug">
.bubble-btn-component.bubble-btn-component--single-text.animate-text
  .bubble-btn-component__text.lh-base(v-html="botHelper.convertMarkdownToHtml(message.content)")
//- TODO: move ElScrollbar to a separate component because of event listeners when issue #55 is closed

//- Search Criteria Component
.search-criteria.animate-search-criteria(v-if="message.search_criteria && message.search_criteria.length > 0")
  p.search-criteria-header  {{ $t("text.yourSearchCriteria") }}:
  .search-criteria-tags
    span.search-tag.animate-tag(v-for="(criteria, index) in message.search_criteria" :key="index" :style="{ animationDelay: `${index * 0.1}s` }")
      | {{ criteria }}
      ElIcon
        SelectIcon
div(v-if="sortedOptions.length > 0")
  ElScrollbar.bubble-btn-component_scrollbar-wrapper(ref="scrollbar")
    .scrollbar-flex-content(
      ref="scrollContainer"
      :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
    )
      ElCard.custom-card.animate-card(v-for="(option, index) in sortedOptions" :key="index" :data-product_id="option.item_id" :data-sku="option.sku" :data-message_id="message.id" :data-conversation_id="message.conversation_id" data-tracking-object="item" :data-tracking-name="option.sku" :style="{ animationDelay: `${0.2 + index * 0.15}s` }")
        .card-header(@click="openPropertyPreview(option)" style="cursor: pointer" :data-product_id="option.item_id" :data-sku="option.sku" :data-message_id="message.id" :data-conversation_id="message.conversation_id" data-action="image")
          .card-image(v-if="option.image_url" :style="{ backgroundImage: 'url(' + getFirstImageUrl(option.image_url) + ')' }")
          ElImage.card-image(v-else)
            template(#error)
              div.image-slot
                ElIcon
                  PictureIcon
                p.text-center.fs-5.px-5 {{ $t("text.itemImageNotAvailable") }}
          .action-buttons(v-if="!botParameters.preview")
            //- IconThumbUp.like-btn(@click="toggleLike(option.id)" :class="{ 'liked': isLiked(option.id) }")
            IconThumbDown.unlike-btn(@click.stop="removeItem(index, option.id)")
        .card-details.property-card__body
          .property-card__tags
            span.property-card__tag(v-if="option.category") {{ option.category }}
            span.property-card__tag(v-if="option.description_metadata?.sources?.wp_crm?.address?.address_city") {{ option.description_metadata.sources.wp_crm.address.address_city }}
          h3.card-text.property-card__name(:title="option.name") {{option.name}}
          .property-card__specs(v-if="option.description_metadata?.sources?.wp_crm?.specifications")
            span(v-if="option.description_metadata.sources.wp_crm.specifications.bedrooms") {{ option.description_metadata.sources.wp_crm.specifications.bedrooms }} {{ $t("text.bedrooms") }}
            span(v-if="option.description_metadata.sources.wp_crm.specifications.bathrooms") {{ option.description_metadata.sources.wp_crm.specifications.bathrooms }} {{ $t("text.bathrooms") }}
            span(v-if="option.description_metadata.sources.wp_crm.specifications.size_in_sqmt") {{ option.description_metadata.sources.wp_crm.specifications.size_in_sqmt }} m²
          .property-card__divider
          .property-card__footer
            .card-price(v-if="option.price")
              span.property-card__price-label {{ $t("text.publicPrice") }}
              p.property-card__price {{ option.currency || 'MUR' }} {{ formatPrice(option.price) }}
            ElButton.property-card__cta(:color="botParameters.primaryColor" @click="openPropertyPreview(option)" :data-product_id="option.item_id" :data-sku="option.sku" :data-message_id="message.id" :data-conversation_id="message.conversation_id" data-action="view" data-tracking-object="item" :data-tracking-name="option.sku" data-tracking-context="item")
              | {{ $t("btn.viewItem") }}
              svg(width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true")
                path(d="M5 12h14M13 6l6 6-6 6")

//- Global/batch action buttons - displayed independently of items
div.d-flex.flex-column.row-gap-3.animate-actions(v-if="message.actions && Object.keys(message.actions).length > 0")
  //- .bubble-btn-component.bubble-btn-component--single-text.me-5(v-for="actionKey in Object.keys(message.actions)" :key="actionKey")
  //-   .bubble-btn-component__text.lh-base(@click="handleActionBtnClick({key:actionKey, actionObjValues: message.actions[actionKey]})" style="cursor: pointer; display: flex; gap: 2px; align-items: center;")
  //-     ArrowRightRounded
  //-     p(v-html="message.actions[actionKey].frontend_params.text")
  ElButton.global-action-btn.animate-action-btn(v-for="(actionKey, index) in popupActionKeys" class="pulse-glow" :key="actionKey" :disabled="botParameters.preview" round :color="botParameters.primaryColor" @click="handleActionBtnClick({key:actionKey, actionObjValues: message.actions[actionKey]})" :data-message_id="message.id" :data-conversation_id="message.conversation_id" :data-action="actionKey" data-tracking-object="action" :data-tracking-name="actionKey" data-tracking-context="message" :style="{ animationDelay: `${0.5 + index * 0.1}s` }") {{ message.actions[actionKey].frontend_params.text }}

//- Inline forms for actions that require them
InlineForm(
  v-for="inlineAction in inlineActions"
  :key="inlineAction.key"
  :form-name="getFormName(inlineAction.actionObjValues.prerequisite)"
  :pending-action="inlineAction"
  :action-text="inlineAction.actionObjValues.frontend_params.text"
  :is-completed="inlineAction.isCompleted"
  @form-completed="onInlineFormCompleted(inlineAction.key)"
)

//- Property Preview Modal
PropertyPreview(
  v-if="selectedProperty"
  :property="selectedProperty"
  @close="closePropertyPreview"
  @handle-action="handleActionBtnClick"
)
</template>

<script>
import { ElCard, ElButton, ElScrollbar, ElImage, ElIcon } from "element-plus";
import { mapState, mapActions } from "pinia";
import { useBotStore } from "@/store/bot";
import CardDescription from "./card/CardDescription.vue";
import InlineForm from "./InlineForm.vue";
import PropertyPreview from "./PropertyPreview.vue";
import {
  Picture as PictureIcon,
  View as ViewIcon,
  Document as DocumentIcon,
  ChatDotRound as ContactIcon,
  ShoppingCart as CartIcon,
  Select as SelectIcon,
  CircleCheckFilled as IconThumbUp,
  CircleCloseFilled as IconThumbDown,
} from "@element-plus/icons-vue";
import ArrowRightRounded from "../Icons/ArrowRightRounded.vue";
import { uuidv7 } from "uuidv7";
import { useEventListener } from "@vueuse/core";
import { ref, onMounted, watch, nextTick } from "vue";
import { botHelper } from "@/helpers/bot";

export default {
  name: "BotSuggestions",
  components: {
    ElCard,
    ElButton,
    ElScrollbar,
    ElImage,
    ElIcon,
    CardDescription,
    InlineForm,
    PropertyPreview,
    PictureIcon,
    ViewIcon,
    DocumentIcon,
    ContactIcon,
    CartIcon,
    SelectIcon,
    IconThumbUp,
    IconThumbDown,
    ArrowRightRounded,
  },

  setup(props) {
    const scrollbar = ref(null);
    const scrollContainer = ref(null);
    const isDragging = ref(false);
    const startX = ref(0);
    const startScrollLeft = ref(0);

    // Store cleanup functions
    let cleanupFunctions = [];

    const startDrag = (e) => {
      if (e.button !== 0) return; // Only left mouse button

      isDragging.value = true;
      startX.value = e.clientX;
      if (scrollbar.value?.wrapRef) {
        startScrollLeft.value = scrollbar.value.wrapRef.scrollLeft;
      }
      e.preventDefault();
    };

    const onDrag = (e) => {
      if (!isDragging.value) return;

      e.preventDefault();
      const deltaX = e.clientX - startX.value;
      if (scrollbar.value?.wrapRef) {
        scrollbar.value.wrapRef.scrollLeft =
          startScrollLeft.value - deltaX * 1.5;
      }
    };

    const endDrag = () => {
      isDragging.value = false;
    };

    // Cleanup drag listeners
    const cleanupDragListeners = () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions = [];
    };

    // Setup drag listeners
    const setupDragListeners = () => {
      cleanupDragListeners();

      if (scrollContainer.value) {
        cleanupFunctions.push(
          useEventListener(scrollContainer.value, "mousedown", startDrag),
          useEventListener(document, "mousemove", onDrag),
          useEventListener(document, "mouseup", endDrag),
          useEventListener(document, "mouseleave", endDrag)
        );
      }
    };

    // Watch for when products become available
    watch(() => props.message?.metadata?.items?.length, async (newLength) => {
      if (newLength > 0) {
        await nextTick();
        setupDragListeners();
      }
    }, { immediate: true });

    // Setup event listeners on mount
    onMounted(async () => {
      await nextTick();
      setupDragListeners();
    });

    return {
      scrollbar,
      scrollContainer,
      isDragging,
      botHelper,
    };
  },

  data() {
    return {
      likedItems: new Set(),
      completedInlineActions: new Set(),
      selectedProperty: null,
    };
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
    ...mapState(useBotStore, ["botParameters", "session"]),
    // sort options with image first
    sortedOptions() {
      if (!this.message.metadata.items) return [];
      return [...this.message.metadata.items].sort((a, b) => {
        if (a.image_url && !b.image_url) return -1;
        if (!a.image_url && b.image_url) return 1;
        return 0;
      });
    },
    // Get actions that should display inline forms
    inlineActions() {
      if (!this.message.actions) return [];
      return Object.keys(this.message.actions)
        .filter((actionKey) => {
          const action = this.message.actions[actionKey];
          const prerequisite = action.prerequisite;
          if (!prerequisite) return false;
          const displayMode =
            typeof prerequisite === "string" ? "popup" : prerequisite.where;
          return displayMode === "inline";
        })
        .map((actionKey) => ({
          key: actionKey,
          actionObjValues: this.message.actions[actionKey],
          urlParam: actionKey,
          frontendParams: this.message.actions[actionKey].frontend_params,
          backendParams: this.message.actions[actionKey].backend_params,
          isCompleted: this.completedInlineActions.has(actionKey),
        }));
    },
    // Get action keys that should show as buttons (popup actions)
    popupActionKeys() {
      if (!this.message.actions) return [];
      return Object.keys(this.message.actions).filter((actionKey) => {
        const action = this.message.actions[actionKey];
        const prerequisite = action.prerequisite;
        if (!prerequisite) return true; // No prerequisite = show as button
        const displayMode =
          typeof prerequisite === "string" ? "popup" : prerequisite.where;
        return displayMode === "popup";
      });
    },
  },

  methods: {
    ...mapActions(useBotStore, [
      "addToCart",
      "actionExecuteBackend",
      "setStatusTyping",
      "processMessage",
      "toggleDynamicForm",
      "setPendingAction",
      "setMessagesData",
      "responseWithErrorMessage",
      "removeItemFromCart",
    ]),

    getFirstImageUrl(imageUrl) {
      if (!imageUrl) return "";
      return imageUrl.split(",")[0].trim();
    },

    removeItem(optionIndex, itemId) {
      this.removeItemFromCart({
        messageIndex: this.messageIndex,
        optionIndex,
        itemId,
      });
    },

    toggleLike(itemId) {
      if (this.likedItems.has(itemId)) {
        this.likedItems.delete(itemId);
      } else {
        this.likedItems.add(itemId);
      }
    },

    isLiked(itemId) {
      return this.likedItems.has(itemId);
    },

    learnMore(url) {
      window.open(url, "_blank");
      // Close/minimize the bot when user clicks View Item
      this.$emit('close-bot');
    },
    formatPrice(price) {
      price = price.toFixed(2);
      return parseFloat(price).toLocaleString();
    },
    async handleActionBtnClick({ key, actionObjValues }) {
      const { frontend_params, backend_params, prerequisite } = actionObjValues;
      const { operation_type } = frontend_params;

      if (prerequisite) {
        const prerequisiteName =
          typeof prerequisite === "string" ? prerequisite : prerequisite.name;

        if (prerequisiteName === "collect_infos") {
          this.toggleDynamicForm("contactForm");
          this.setPendingAction({
            urlParam: key,
            frontendParams: frontend_params,
            backendParams: backend_params,
          });
          return;
        }
      }

      const messagePayload = {
        id: uuidv7(),
        conversation_id: this.session.conversationId,
        sender_id: null,
        content: frontend_params.text,
        delivered: false,
        viewed: false,
        sent_at: null,
        message_type: "user",
        metadata: {},
        tags: {},
        tenantId: null,
      };
      this.setMessagesData(messagePayload);
      try {
        if (operation_type === "execute_backend") {
          this.setStatusTyping(true);
          const res = await this.actionExecuteBackend({
            url: key,
            params: backend_params,
          });
          if (res.status === 200) {
            this.processMessage(res.data);
          } else {
            this.setStatusTyping(false);
          }
        } else if (operation_type === "follow_url") {
          console.log("follow_url", frontend_params);
          throw new Error("follow_url not implemented");
        } else {
          console.log("unknown operation_type", operation_type);
          throw new Error("unknown operation_type");
        }
      } catch (err) {
        // console.error(err);
        this.responseWithErrorMessage();
      }
    },

    getFormName(prerequisite) {
      if (!prerequisite) return "contactForm";
      const name =
        typeof prerequisite === "string" ? prerequisite : prerequisite.name;
      return name === "collect_infos" ? "contactForm" : name;
    },

    onInlineFormCompleted(actionKey) {
      this.completedInlineActions.add(actionKey);
    },

    openPropertyPreview(property) {
      this.selectedProperty = property;
    },

    closePropertyPreview() {
      this.selectedProperty = null;
    },
  },
};
</script>

<style lang="scss">
.el-scrollbar__wrap {
  height: auto;
}

.image-slot {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 40px;
  row-gap: 0.875rem;
}

// Prevent text selection while dragging
.scrollbar-flex-content {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.pulse-glow {
  animation: pulseGlow 2s infinite;
}

@keyframes pulseGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(217, 217, 217, 0.5);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
  }
}

// Follow-up actions styling
.d-flex.flex-column.row-gap-3 {
  margin-top: 1rem;
  padding: 0 1rem;

  .global-action-btn {
    width: 100%;
    height: auto;
    min-height: 44px;
    padding: 10px 20px;
    font-weight: 500;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    margin: 0 !important;
    white-space: normal;
    word-wrap: break-word;
    text-align: center;
    line-height: 1.4;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }

    // Ensure text color is white for visibility on colored background
    span {
      color: white !important;
      white-space: normal;
      word-wrap: break-word;
    }
  }
}

/* Search Criteria Component */
.search-criteria {
  border-radius: 8px;
  margin: 0 0 0.75rem 0;
}

.search-criteria-header {
  color: #494949;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 0.4rem !important;
}

.search-criteria-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-tag {
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-tag-icon {
  width: 12px;
  height: 12px;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

/* ========================================
   ELEGANT ANIMATIONS
   ======================================== */

/* Text fade in with slide up */
.animate-text {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Search criteria container fade in */
.animate-search-criteria {
  animation: fadeIn 0.4s ease-out 0.3s forwards;
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Search tags slide in from left */
.animate-tag {
  animation: slideInTagFromLeft 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  opacity: 0;
  transform: translateX(-30px);
}

@keyframes slideInTagFromLeft {
  from {
    opacity: 0;
    transform: translateX(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Villa cards slide in from left with fade */
.animate-card {
  animation: slideInFromLeft 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  opacity: 0;
  transform: translateX(-50px);
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Action buttons fade in with bounce */
.animate-action-btn {
  animation: fadeInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  opacity: 0;
  transform: scale(0.9);
}

@keyframes fadeInBounce {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  60% {
    opacity: 1;
    transform: scale(1.05) translateY(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Add hover enhancement for animated cards */
.animate-card:hover {
  transform: translateY(-5px) scale(1.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

/* Smooth card transition after animation completes */
.animate-card {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
