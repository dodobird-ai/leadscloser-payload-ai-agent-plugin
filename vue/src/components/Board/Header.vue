<template lang="pug">
.board-header
  slot(name="header")
    .board-header__title(v-if="statusChatMode") {{botParameters.title}}
    .board-header__title(v-else) Recent Chats
    .board-header__menu()
      ElIcon.m-1.board-header__actions(v-if="!botParameters.preview && !statusSmallScreen && botParameters.view === 'both'", @click="togglePosition", size="20", color="#CBCCCD")
        BottomLeft(v-if="statusSidebar")
        TopRight(v-else)
      ElIcon.m-1.board-header__actions(v-if="!botParameters.preview && !statusSmallScreen && !statusSidebar", @click="toggleFullScreen", size="20", color="#CBCCCD")
        FullScreen(v-if="!urlParams.fullscreen")
        Minus(v-else)
      ElPopover(
        v-if="!botParameters.preview || (botParameters.preview && isMobile)"
        placement="bottom-end",
        :width="200",
        trigger="click",
        v-model:visible="showMenuModal"
        popper-style="z-index: 2147483644; padding: 8px"
      )
        template(#reference)
          ElIcon.m-1.board-header__actions(color="#CBCCCD", size="20")
            MoreFilled
        .menu-modal-content
          .menu-item(@click="startNewChat")
            IconMessageCirclePlus.menu-icon(:size="16" stroke="1.5")
            span {{ $t('btn.newChat') }}
          .menu-item(@click="viewRecentChats")
            ElIcon.menu-icon
              Clock
            span {{ $t('btn.viewRecentChats') }}
      ElIcon.m-1.board-header__actions(v-if="!botParameters.preview" @click="$emit('close-bot')", size="24", color="#CBCCCD")
        Close
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { useBotStore } from '@/store/bot';
import { ElIcon, ElPopover } from 'element-plus';
import { isSilentForm, autoSubmitSilentForm } from '@/hooks/formHooks';
import {
  FullScreen,
  Minus,
  Close,
  Monitor,
  TopRight,
  BottomLeft,
  MoreFilled,
  ChatDotRound,
  Clock
} from '@element-plus/icons-vue';
import { IconMessageCirclePlus } from '@tabler/icons-vue';

export default {
  name: 'HeaderComponent',
  components: {
    FullScreen,
    Minus,
    Close,
    Monitor,
    TopRight,
    BottomLeft,
    ElIcon,
    MoreFilled,
    ChatDotRound,
    Clock,
    ElPopover,
    IconMessageCirclePlus
  },
  data() {
    return {
      showMenuModal: false,
      isMobile: window.getIsMobile ? window.getIsMobile() : false
    };
  },
  computed: {
    ...mapState(useBotStore, ['statusSidebar', 'botParameters', 'urlParams', 'statusSmallScreen', 'statusChatMode', 'messagesDataForCurrentConversation', 'statusTyping', 'dynamicForms'])
  },
  methods: {
    ...mapActions(useBotStore, ['setStatusChatMode', 'clearConversation', 'createConversation', 'toggleDynamicForm']),
    toggleFullScreen() {
      this.$emit('fullscreen-bot');
    },
    togglePosition() {
      this.$emit('toggle-position');
    },
    async startNewChat() {
      // TODO: refactor this logic everywhere - this is duplicated in BotUI.vue and RecentChats.vue
      this.showMenuModal = false;

      // Clear the current conversation if there are messages
      if (this.messagesDataForCurrentConversation.length > 1 && !this.statusTyping) {
        await this.clearConversation();

        // Check if localeForm is silent (auto-submit) or needs to be shown
        const localeFormConfig = this.dynamicForms?.localeForm;

        if (isSilentForm(localeFormConfig)) {
          // For silent forms, auto-submit with detected values
          await autoSubmitSilentForm('localeForm', localeFormConfig, useBotStore());
        } else if (localeFormConfig?.schema) {
          // Show the locale form popup for new chats (only if schema is available)
          this.toggleDynamicForm('localeForm');
        }
      }

      // Create a new conversation
      this.createConversation();

      // Switch to chat mode
      this.setStatusChatMode(true);

      // Emit the event for parent components to handle additional logic
      this.$emit('start-new-chat');
    },
    // endChat() {
    //   this.showMenuModal = false;
    //   this.$emit('end-chat');
    //   // Add your logic for ending the chat
    // },
    viewRecentChats() {
      this.showMenuModal = false;
      this.setStatusChatMode(false);
    }
  },
  mounted() {}
};
</script>

<style scoped>
.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.board-header__menu {
  flex-shrink: 0;
}

.board-header__title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.board-header__menu {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-modal-content {
  padding: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 4px;
  margin-bottom: 4px;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item:last-child {
  margin-bottom: 0;
}

.menu-icon {
  margin-right: 12px;
  color: #666;
}

.menu-item span {
  color: #333;
  font-weight: 400;
  font-family: 'Poppins', sans-serif !important;
}

/* Custom popover styles */
:deep(.el-popover) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
}
</style>
