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
div(v-if="sortedOptions.length > 0 || isSorting")
  //- Sort controls and result count
  .search-results-header(v-if="message.total_count || isSorting")
    span.search-results-count(v-if="!isSorting") {{ message.metadata.items.length }} of {{ message.total_count }} properties
    span.search-results-count.search-results-count--loading(v-else)
      span.search-loader-dot
      span.search-loader-dot
      span.search-loader-dot
    .search-sort-controls
      button.search-sort-btn(:class="{ active: currentSort === 'asc' }" :disabled="isSorting || isLoadingMore" @click="changeSort('ASC')") Price ↑
      button.search-sort-btn(:class="{ active: currentSort === 'desc' }" :disabled="isSorting || isLoadingMore" @click="changeSort('DESC')") Price ↓
  //- Sorting overlay: show skeleton cards while re-sorting
  .search-sorting-overlay(v-if="isSorting")
    .scrollbar-flex-content
      .property-card.property-card--skeleton(v-for="n in 3" :key="'skeleton-' + n")
        .property-card__image.property-card__image--skeleton
        .property-card__content
          .skeleton-line.skeleton-line--tag
          .skeleton-line.skeleton-line--title
          .skeleton-line.skeleton-line--stats
        .property-card__footer
          .skeleton-line.skeleton-line--price
  ElScrollbar.bubble-btn-component_scrollbar-wrapper(v-else ref="scrollbar")
    .scrollbar-flex-content(
      ref="scrollContainer"
      :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
    )
      .property-card.animate-card(v-for="(option, index) in sortedOptions" :key="option.item_id || index" :data-product_id="option.item_id" :data-sku="option.sku" :data-message_id="message.id" :data-conversation_id="message.conversation_id" data-tracking-object="item" :data-tracking-name="option.sku" :style="cardAnimationStyle(index)")
        //- Image Section
        .property-card__image-section(@click="openPropertyPreview(option)" :data-product_id="option.item_id" :data-sku="option.sku" :data-message_id="message.id" :data-conversation_id="message.conversation_id" data-action="image")
          .property-card__image(v-if="option.image_url" :style="{ backgroundImage: 'url(' + getFirstImageUrl(option.image_url) + ')' }")
          .property-card__image.property-card__image--placeholder(v-else)
            ElIcon.property-card__placeholder-icon
              PictureIcon
          //- Remove Button
          button.property-card__remove(v-if="!botParameters.preview" @click.stop="removeItem(index, option.item_id)")
            IconThumbDown

        //- Content Section (flexible, takes remaining space)
        .property-card__content
          //- Tags Section
          .property-card__tags
            span.property-card__tag(v-if="option.category") {{ formatCategory(option.category) }}
            span.property-card__tag.property-card__tag--highlight(v-if="option.meta_category") {{ getFullStatusLabel(option.meta_category) }}
            span.property-card__tag.property-card__tag--highlight(v-if="isAccessibleToForeigners(option)") FOREIGNERS OK

          //- Title
          .property-card__title {{ option.name }}

          //- Stats Row
          .property-card__stats(v-if="getSpecs(option).bedrooms || getSpecs(option).size_in_sqmt || getSpecs(option).lot_size")
            span.property-card__stat(v-if="getSpecs(option).bedrooms") {{ getSpecs(option).bedrooms }} {{ getSpecs(option).bedrooms === 1 ? 'BED' : 'BEDS' }}
            span.property-card__stat(v-if="getSpecs(option).bathrooms") {{ getSpecs(option).bathrooms }} {{ getSpecs(option).bathrooms === 1 ? 'BATH' : 'BATHS' }}
            span.property-card__stat(v-if="getSpecs(option).size_in_sqmt") {{ formatArea(getSpecs(option).size_in_sqmt) }} M²
            span.property-card__stat(v-if="!getSpecs(option).size_in_sqmt && getSpecs(option).lot_size") {{ formatArea(getSpecs(option).lot_size) }} M² LAND

        //- Footer Section (always at bottom)
        .property-card__footer
          //- Price Section
          .property-card__price-section
            .property-card__price-wrapper
              span.property-card__price-label PRICE
              .property-card__price
                span(v-if="option.currency") {{ option.currency }}
                span(v-else) USD
                | &nbsp;{{ formatPrice(option.price) }}
            button.property-card__view-btn(@click="openPropertyPreview(option)" :data-product_id="option.item_id" :data-sku="option.sku" :data-message_id="message.id" :data-conversation_id="message.conversation_id" data-action="view" data-tracking-object="item" :data-tracking-name="option.sku" data-tracking-context="item")
              | View
              ArrowRightIcon

          //- Agent Section (if available)
          .property-card__agent(v-if="getAgent(option).agent_name")
            .property-card__agent-avatar
              img(v-if="getAgent(option).agent_photo_url" :src="getAgent(option).agent_photo_url" :alt="getAgent(option).agent_name")
              .property-card__agent-avatar-placeholder(v-else)
                | {{ getInitials(getAgent(option).agent_name) }}
            .property-card__agent-info
              span.property-card__agent-label Marketed by
              span.property-card__agent-name {{ getAgent(option).agent_name }}

      //- Load More card at the end of carousel
      .property-card.property-card--load-more(v-if="message.has_more && !isLoadingMore" @click="loadMoreResults")
        .property-card__load-more-content
          ElIcon.property-card__load-more-icon
            ArrowRightIcon
          span.property-card__load-more-text Load more
          span.property-card__load-more-count {{ message.metadata.items.length }} / {{ message.total_count }}
      .property-card.property-card--load-more.property-card--loading(v-if="isLoadingMore")
        .property-card__load-more-content
          .search-spinner
          span.property-card__load-more-text Loading properties...

//- Global/batch action buttons - displayed independently of items
div.d-flex.flex-row.flex-wrap.gap-2.align-items-center.animate-actions(v-if="message.actions && Object.keys(message.actions).length > 0")
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
  Star as HeartIcon,
  ArrowRight as ArrowRightIcon,
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
    HeartIcon,
    ArrowRightIcon,
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
      isLoadingMore: false,
      isSorting: false,
      currentPage: 1,
      currentSort: "asc",
      previousItemCount: 0,
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
    // Determine animation style per card: no animation for already-visible cards,
    // short staggered entrance for newly loaded ones
    cardAnimationStyle() {
      return (index) => {
        if (index < this.previousItemCount) {
          // Already visible card — no animation
          return { animationDelay: '0s', animationDuration: '0s', opacity: 1 };
        }
        // New card — short stagger relative to the batch start
        const batchIndex = index - this.previousItemCount;
        return { animationDelay: `${batchIndex * 0.08}s` };
      };
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
      "fetchSearchPage",
      "clearMessageItems",
    ]),

    async loadMoreResults() {
      if (!this.message.search_id || this.isLoadingMore) return;
      this.isLoadingMore = true;
      this.previousItemCount = this.message.metadata.items?.length || 0;
      this.currentPage++;

      // Prevent chat from auto-scrolling to bottom
      const store = useBotStore();
      store.status.skipAutoScroll = true;

      try {
        await this.fetchSearchPage({
          searchId: this.message.search_id,
          page: this.currentPage,
          sort: "price",
          direction: this.currentSort.toUpperCase(),
          messageId: this.message.id,
        });

        // Add glow to newly loaded cards after DOM updates
        await this.$nextTick();
        await this.$nextTick(); // second tick to ensure cards are rendered
        const container = this.$refs.scrollContainer;
        if (container) {
          const cards = container.querySelectorAll('.property-card.animate-card');
          const newCards = [];
          for (let i = this.previousItemCount; i < cards.length; i++) {
            cards[i].classList.add('newly-loaded-glow');
            newCards.push(cards[i]);
          }
          // Start fading the glow after a brief moment
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              newCards.forEach(el => el.classList.add('newly-loaded-glow--fade'));
            });
          });
          // Clean up classes after transition
          setTimeout(() => {
            newCards.forEach(el => {
              el.classList.remove('newly-loaded-glow', 'newly-loaded-glow--fade');
            });
          }, 2500);
        }
      } finally {
        this.isLoadingMore = false;
        store.status.skipAutoScroll = false;
      }
    },

    async changeSort(direction) {
      if (!this.message.search_id || this.isSorting) return;
      this.currentSort = direction.toLowerCase();
      // Reset items and reload from page 1 with new sort
      this.clearMessageItems(this.message.id);
      this.currentPage = 1;
      this.previousItemCount = 0;
      this.isSorting = true;
      try {
        await this.fetchSearchPage({
          searchId: this.message.search_id,
          page: 1,
          sort: "price",
          direction: direction,
          messageId: this.message.id,
        });
      } finally {
        this.isSorting = false;
      }
    },

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
      if (!price) return '0';
      return parseFloat(price).toLocaleString();
    },
    formatArea(area) {
      if (!area) return '0';
      return parseFloat(area).toLocaleString();
    },
    getInitials(name) {
      if (!name) return '?';
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    },
    // Extract specifications from nested structure
    getSpecs(option) {
      return option?.description_metadata?.sources?.wp_crm?.specifications || {};
    },
    // Extract agent info from nested structure
    getAgent(option) {
      return option?.description_metadata?.sources?.wp_crm?.agent || {};
    },
    // Check if accessible to foreigners
    isAccessibleToForeigners(option) {
      const specs = this.getSpecs(option);
      return specs.accessible_to_foreigners === 1;
    },
    // Format category name
    formatCategory(category) {
      if (!category) return '';
      return category.charAt(0).toUpperCase() + category.slice(1);
    },
    // Get full status label combining sale/rent with status
    getFullStatusLabel(metaCategory) {
      if (!metaCategory) return '';
      const labels = {
        'sale_buit': 'FOR SALE BUILT',
        'sales_off_plan': 'FOR SALE OFF PLAN',
        'sale_land': 'FOR SALE LAND',
        'rent': 'FOR RENT'
      };
      return labels[metaCategory] || '';
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

/* ========================================
   PROPERTY CARD STYLES (Luxury Real Estate)
   ======================================== */

.property-card {
  flex: 0 0 auto;
  width: 260px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-right: 16px;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
  }

  &:last-child {
    margin-right: 0;
  }
}

.property-card__image-section {
  position: relative;
  cursor: pointer;
}

.property-card__image {
  width: 100%;
  height: 150px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #f5f5f5;

  &--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #e8e8e8 0%, #f5f5f5 100%);
  }
}

.property-card__placeholder-icon {
  font-size: 48px;
  color: #ccc;
}

.property-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.property-card__footer {
  margin-top: auto;
}

.property-card__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 12px;
    height: 12px;
    color: rgba(255, 255, 255, 0.8);
  }

  &:hover {
    background: rgba(220, 53, 69, 0.9);
    svg {
      color: #fff;
    }
  }
}

.property-card__tags {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  padding: 10px 16px 0;
  overflow: hidden;
}

.property-card__tag {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.4px;
  color: #666;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;

  &--highlight {
    background: #1a2b49;
    color: #fff;
    padding: 3px 8px;
    border-radius: 3px;
  }
}

.property-card__title {
  padding: 10px 16px 6px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16px;
  font-weight: 400;
  color: #1a2b49;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.property-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 16px 10px;
}

.property-card__stat {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.3px;
  color: #888;
  text-transform: uppercase;
}

.property-card__price-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #f0f0f0;
}

.property-card__price-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.property-card__price-label {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: #999;
  text-transform: uppercase;
}

.property-card__price {
  font-size: 18px;
  font-weight: 600;
  color: #1a2b49;
  letter-spacing: -0.3px;
}

.property-card__view-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 10px;
  background: #1a2b49;
  border: none;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.4px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  text-transform: uppercase;
  flex-shrink: 0;

  svg {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
  }

  &:hover {
    background: #0f1a2e;
  }
}

.property-card__agent {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.property-card__agent-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.property-card__agent-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a2b49;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.property-card__agent-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.property-card__agent-label {
  font-size: 11px;
  color: #888;
}

.property-card__agent-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a2b49;
}

/* ========================================
   PROPERTY CARD RESPONSIVE STYLES
   ======================================== */

// Tablet breakpoint
@media (max-width: 768px) {
  .property-card {
    width: 240px;
    margin-right: 12px;
  }

  .property-card__image {
    height: 130px;
  }

  .property-card__title {
    font-size: 15px;
    padding: 8px 12px 6px;
  }

  .property-card__tags {
    padding: 8px 12px 0;
    gap: 4px;
  }

  .property-card__tag {
    font-size: 9px;

    &--highlight {
      padding: 3px 8px;
    }
  }

  .property-card__stats {
    padding: 0 12px 8px;
    gap: 8px;
  }

  .property-card__stat {
    font-size: 9px;
  }

  .property-card__price-section {
    padding: 8px 10px;
    gap: 6px;
  }

  .property-card__price-label {
    font-size: 8px;
  }

  .property-card__price {
    font-size: 16px;
  }

  .property-card__view-btn {
    padding: 4px 8px;
    font-size: 8px;

    svg {
      width: 8px;
      height: 8px;
    }
  }

  .property-card__agent {
    padding: 8px 12px;
    gap: 8px;
  }

  .property-card__agent-avatar {
    width: 28px;
    height: 28px;
  }

  .property-card__agent-label {
    font-size: 10px;
  }

  .property-card__agent-name {
    font-size: 12px;
  }

  .property-card__remove {
    width: 22px;
    height: 22px;
    top: 6px;
    right: 6px;

    svg {
      width: 10px;
      height: 10px;
    }
  }
}

// Mobile breakpoint
@media (max-width: 480px) {
  .property-card {
    width: 220px;
    margin-right: 10px;
  }

  .property-card__image {
    height: 120px;
  }

  .property-card__title {
    font-size: 14px;
    padding: 6px 10px 4px;
  }

  .property-card__tags {
    padding: 6px 10px 0;
  }

  .property-card__tag {
    font-size: 8px;

    &--highlight {
      padding: 2px 6px;
      border-radius: 3px;
    }
  }

  .property-card__stats {
    padding: 0 10px 6px;
    gap: 6px;
  }

  .property-card__stat {
    font-size: 8px;
  }

  .property-card__price-section {
    padding: 6px 8px;
    gap: 4px;
  }

  .property-card__price {
    font-size: 14px;
  }

  .property-card__view-btn {
    padding: 3px 6px;
    font-size: 7px;

    svg {
      width: 7px;
      height: 7px;
    }
  }

  .property-card__agent {
    padding: 6px 10px;
  }

  .property-card__agent-avatar {
    width: 24px;
    height: 24px;
  }

  .property-card__agent-label {
    font-size: 9px;
  }

  .property-card__agent-name {
    font-size: 11px;
  }
}

// Follow-up actions styling
.d-flex.flex-column.row-gap-3 {
  margin-top: 1rem;
  padding: 0 1rem;

  .global-action-btn {
    width: auto;
    height: auto;
    padding: 10px 20px;
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #1a2b49 !important;
    color: #fff !important;
    border: none;
    border-radius: 3px;
    box-shadow: none;
    transition: all 0.2s ease;
    margin: 0 !important;
    white-space: nowrap;

    &:hover {
      opacity: 0.9;
      box-shadow: none;
    }

    &:active {
      opacity: 0.8;
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
  background: #1a2b49;
  color: #fff;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.4px;
  text-transform: uppercase;
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

/* ========================================
   SEARCH RESULTS HEADER (count + sort)
   ======================================== */

.search-results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
}

.search-results-count {
  font-weight: 500;
}

.search-sort-controls {
  display: flex;
  gap: 4px;
}

.search-sort-btn {
  padding: 2px 8px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #999;
  }

  &.active {
    background: #333;
    color: #fff;
    border-color: #333;
  }
}

/* ========================================
   LOAD MORE CARD
   ======================================== */

.property-card--load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px dashed #ddd;
  background: #fafafa;
  min-height: 200px;

  &:hover {
    border-color: #999;
    background: #f0f0f0;
  }
}

.property-card__load-more-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #666;
}

.property-card__load-more-icon {
  font-size: 28px;
  color: #999;
}

.property-card__load-more-text {
  font-size: 14px;
  font-weight: 500;
}

.property-card__load-more-count {
  font-size: 11px;
  color: #999;
}

/* ========================================
   LOADING SPINNER
   ======================================== */

.search-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e0e0e0;
  border-top-color: #1a2b49;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.property-card--loading {
  border-color: #ccc;
  pointer-events: none;
}

/* ========================================
   SKELETON CARDS (sort loading)
   ======================================== */

.search-sorting-overlay {
  overflow: hidden;

  .scrollbar-flex-content {
    display: flex;
    gap: 16px;
    padding: 4px 0;
  }
}

.property-card--skeleton {
  pointer-events: none;
  opacity: 0.6;

  .property-card__image--skeleton {
    height: 150px;
    background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .property-card__content {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}

.skeleton-line {
  border-radius: 4px;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;

  &--tag {
    width: 60%;
    height: 12px;
  }

  &--title {
    width: 85%;
    height: 18px;
  }

  &--stats {
    width: 50%;
    height: 10px;
  }

  &--price {
    width: 40%;
    height: 20px;
    margin: 10px 14px;
  }
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ========================================
   LOADING DOTS (results count)
   ======================================== */

.search-results-count--loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.search-loader-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #999;
  animation: dotPulse 1.2s ease-in-out infinite;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes dotPulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.search-sort-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========================================
   NEWLY LOADED GLOW EFFECT
   ======================================== */

.newly-loaded-glow {
  box-shadow: 0 0 12px 3px rgba(26, 43, 73, 0.45), 0 0 24px 6px rgba(26, 43, 73, 0.2) !important;
  transition: box-shadow 2s ease-out !important;
}

.newly-loaded-glow--fade {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
}
</style>
