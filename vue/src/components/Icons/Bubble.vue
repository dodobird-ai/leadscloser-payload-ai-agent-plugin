<template>
  <img :src="bubbleIcon" alt="AI Assistant" class="bubble-icon-img" />
</template>

<script>
import bubbleIcon from '@/assets/bubble-icon.png'

export default {
    name: 'BubbleIcon',
    data() {
        return {
            bubbleIcon
        }
    }
}
</script>

<style scoped>
.bubble-icon-img {
  display: block;
  width: 100%;
  height: auto;
}
</style>

