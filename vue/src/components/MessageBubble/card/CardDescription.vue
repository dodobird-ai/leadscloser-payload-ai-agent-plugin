<template>
  <div class="block-content lh-base">
    <transition
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      mode="out-in"
    >
      <p
        v-if="!isExpanded"
        class="block-content__preview"
        v-html="content"
        ref="previewRef"
      />
      <p
        v-else
        :class="{
          'block-content__paragraph': true,
          'block-content__paragraph--is-expanded': isExpanded,
        }"
        v-html="content"
      />
    </transition>
    <ElButton
      v-if="shouldShowButton"
      link
      bg
      class="block-content__button"
      aria-label="Toggle button"
      @click="clickReadMoreButton()"
    >
      {{ toggleCtaLabel }}
    </ElButton>
  </div>
</template>
<script>
import { computed, defineComponent, ref, toRefs, onMounted } from "vue";
import { ElButton } from "element-plus";
// import { inject } from "vue";
import { t } from "@/i18n";

export default defineComponent({
  name: "ExpandableBlockContent",
  components: {
    ElButton,
  },
  props: {
    content: String,
    visibleLines: {
      type: Number,
      default: 3,
    },
  },

  setup(props) {
    // const updateScroll = inject("updateScroll");
    const { visibleLines } = toRefs(props);

    // Collapsed state
    const LINE_HEIGHT = 16;
    const maxHeightCollapsed = computed(() => LINE_HEIGHT * visibleLines.value);

    // Expanded state
    const isExpanded = ref(false);
    const previewRef = ref(null);
    const shouldShowButton = ref(false);

    const toggleCtaLabel = computed(() =>
      isExpanded.value ? t("text.readLess") : t("text.readMore")
    );

    onMounted(() => {
      // Check if content height exceeds the maximum collapsed height
      if (previewRef.value) {
        const contentHeight = previewRef.value.scrollHeight;
        shouldShowButton.value =
          contentHeight - LINE_HEIGHT > maxHeightCollapsed.value;
      }
    });

    // Animation hooks
    const onBeforeEnter = (el) => {
      el.style.height = `${maxHeightCollapsed.value}px`;
    };

    const onEnter = (el) => {
      el.style.height = `${el.scrollHeight}px`;
    };

    const onAfterEnter = (el) => {
      el.style.overflow = "hidden";
      // updateScroll();
    };

    const onBeforeLeave = (el) => {
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflow = "hidden";
    };

    const onLeave = (el) => {
      el.style.height = `${maxHeightCollapsed.value}px`;
      el.style.overflow = "hidden";
      // updateScroll();
    };

    return {
      isExpanded,
      toggleCtaLabel,
      onBeforeEnter,
      onEnter,
      onAfterEnter,
      onBeforeLeave,
      onLeave,
      maxHeightCollapsed,
      shouldShowButton,
      previewRef,
    };
  },
  methods: {
    clickReadMoreButton() {
      this.isExpanded = !this.isExpanded;
    },
  },
});
</script>

<style lang="scss" scoped>
.block-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.block-content__preview {
  max-height: v-bind("maxHeightCollapsed + 'px'");
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: v-bind(
    visibleLines
  ); // This will show exactly the number of lines specified
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 16px;
  margin: 0;
}

.block-content__paragraph {
  overflow: hidden;
  transition: all 250ms ease-out;
  font-size: 14px;
  line-height: 16px;
  margin: 0;

  &--is-expanded {
    overflow: initial;
  }
}

.block-content__button {
  text-decoration: underline;
  align-self: flex-end;
  font-size: 12px;
  padding: 4px 8px;
  margin-top: 4px;
}
</style>
