<template>
  <div class="new-conversation-icon">
    <!-- Main chat icon -->
    <svg
      class="chat-icon"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <!-- ChatLineSquare path from Element Plus -->
      <path d="M160 832h192l64 64V832h320V640H160v192zm0-256h512V448H160v128zm0-192h512V256H160v128zm704 256V256a32 32 0 0 0-32-32H96a32 32 0 0 0-32 32v576a32 32 0 0 0 32 32h576l192 192V640z" />
    </svg>
    
    <!-- Plus indicator badge -->
    <div class="plus-badge">
      <svg
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
      >
        <!-- Simple, clear plus sign -->
        <rect x="7" y="2" width="2" height="12" />
        <rect x="2" y="7" width="12" height="2" />
      </svg>
    </div>
  </div>
</template>

<script>
export default {
  name: "NewConversationIcon",
};
</script>

<style scoped>
.new-conversation-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5em;
  height: 1.5em;
}

.chat-icon {
  width: 100%;
  height: 100%;
}

.plus-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 0.7em;
  height: 0.7em;
  background-color: currentColor;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px white;
}

.plus-badge svg {
  width: 0.5em;
  height: 0.5em;
  color: white;
}</style>