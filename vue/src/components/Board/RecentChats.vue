<template lang="pug">
.board-content.py-4.ms-2
  .new-chat-button-container
    ElButton.new-chat-button(@click="startNewChat", :color="botParameters.primaryColor")
      IconMessageCirclePlus(:size="20" stroke="1.5" color="white")
      span {{ $t('btn.newChat') }}
  .recent-chats-list(v-if="conversations && conversations.length > 0")
    template(v-for="group in groupedConversations", :key="group.groupName")
      .conversation-group(v-if="group && group.conversations && group.conversations.length > 0")
        p.group-header {{ group.groupName }}
        .conversation-item(
          v-for="conversation in group.conversations",
          :key="conversation.id",
          @click="openConversation(conversation)",
          :class="{ active: conversation.id === session.conversationId }"
        ) 
          .conversation-main
            p.conversation-title {{ new Date(conversation.started_at).toUTCString() }}
          //- ElDropdown.conversation-actions(@click.stop)
          //-   ElIcon.action-icon
          //-     MoreFilled
          //-   template(#dropdown)
          //-     ElDropdownMenu
          //-       ElDropdownItem(@click="renameConversation(conversation)")
          //-         ElIcon
          //-           Edit
          //-         span Rename
          //-       ElDropdownItem(@click="deleteConversation(conversation)", divided)
          //-         ElIcon
          //-           Delete
          //-         span Delete
  .empty-state(v-else)
    ElIcon.empty-icon
      ChatDotRound
    p No recent conversations
    ElButton(@click="startNewChat" :color="botParameters.primaryColor")
      IconMessageCirclePlus(:size="20" stroke="1.5" color="white")
      span {{ $t('btn.newChat') }}
</template>

<script>
import { mapActions, mapState } from 'pinia';
import { vLoading } from 'element-plus';
import { useBotStore } from '@/store/bot';
import { ElButton, ElIcon, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import { Plus, ChatDotRound, MoreFilled, Edit, Delete, ChatLineRound } from '@element-plus/icons-vue';
import { IconMessageCirclePlus } from '@tabler/icons-vue';

export default {
  name: 'RecentChatComponent',
  directives: {
    loading: vLoading
  },
  components: {
    ElButton,
    ElIcon,
    ElDropdown,
    ElDropdownMenu,
    ElDropdownItem,
    Plus,
    ChatDotRound,
    MoreFilled,
    Edit,
    Delete,
    ChatLineRound,
    IconMessageCirclePlus
  },
  data() {
    return {
      currentConversationId: null
    };
  },
  computed: {
    ...mapState(useBotStore, ['botParameters', 'conversations', 'statusChatMode', 'session', 'messagesDataForCurrentConversation', 'statusTyping']),
    groupedConversations() {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const groupByDate = {
        today: [],
        yesterday: [],
        previous7Days: [],
        previous30Days: [],
        older: []
      };

      this.conversations.forEach(conversation => {
        const startedAt = new Date(conversation.started_at);

        if (startedAt.toDateString() === today.toDateString()) {
          groupByDate.today.push(conversation);
        } else if (startedAt.toDateString() === yesterday.toDateString()) {
          groupByDate.yesterday.push(conversation);
        } else if (startedAt >= sevenDaysAgo && startedAt < today) {
          groupByDate.previous7Days.push(conversation);
        } else if (startedAt >= thirtyDaysAgo && startedAt < sevenDaysAgo) {
          groupByDate.previous30Days.push(conversation);
        } else {
          groupByDate.older.push(conversation);
        }
      });

      return [
        { groupName: 'Today', conversations: groupByDate.today },
        { groupName: 'Yesterday', conversations: groupByDate.yesterday },
        { groupName: 'Previous 7 Days', conversations: groupByDate.previous7Days },
        { groupName: 'Previous 30 Days', conversations: groupByDate.previous30Days },
        { groupName: 'Older', conversations: groupByDate.older }
      ];
    }
  },
  methods: {
    ...mapActions(useBotStore, ['setConversations', 'setStatusChatMode', 'setConversationId', 'clearConversation', 'createConversation', 'toggleDynamicForm']),
    async startNewChat() {
      // TODO: refactor this logic everywhere - this is duplicated in BotUI.vue
      // Clear the current conversation if there are messages
      if (this.messagesDataForCurrentConversation.length > 1 && !this.statusTyping) {
        await this.clearConversation();
        // Show the locale form popup for new chats
        this.toggleDynamicForm('localeForm');
      }

      // Create a new conversation
      this.createConversation();

      // Switch to chat mode
      this.setStatusChatMode(true);

      // Emit the event for parent components to handle additional logic
      this.$emit('start-new-chat');
    },
    openConversation(conversation) {
      if (!this.statusChatMode) this.setStatusChatMode(true);
      this.currentConversationId = conversation.id;
      this.setConversationId(conversation.id);
      if (this.botParameters.preview) window.bot_parameters.handleConversationClick(conversation.id);
      else {
        console.log('Open conversation:', conversation.id);
      }
    }
  },
  mounted() {}
};
</script>

<style scoped>
.new-chat-button-container {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.new-chat-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.new-chat-button :deep(.el-button__content) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recent-chats-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.conversation-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-header {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
  padding: 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.conversation-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.conversation-main {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  line-height: 1.4;
}

.conversation-actions {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.action-icon {
  color: #909399;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.action-icon:hover {
  color: #606266;
  background: #f5f7fa;
}

.empty-state {
  text-align: center;
  color: #909399;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-icon {
  font-size: 64px;
  color: #e4e7ed;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 24px;
}

/* Responsive design */
@media (max-width: 768px) {
  .recent-chats-container {
    padding: 16px;
  }

  .conversation-item {
    padding: 12px;
  }

  .conversation-actions {
    opacity: 1;
  }
}

/* Custom dropdown styles */
:deep(.el-dropdown-menu) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}

:deep(.el-dropdown-menu__item:hover) {
  background-color: #f5f7fa;
}
</style>
