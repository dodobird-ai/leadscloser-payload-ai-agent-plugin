<template>
  <div class="bot-avatar">
    <span>S</span>
  </div>
</template>

<script>
export default {
  name: 'ChatBotIcon'
}
</script>

<style scoped>
.bot-avatar {
  width: 37px;
  height: 37px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bot-avatar span {
  font-family: 'Plaster', serif !important;
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 160%;
  color: #FFFFFF;
}
</style>