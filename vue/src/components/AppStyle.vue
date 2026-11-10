<template lang="pug">
.dodobot-bot-style(v-html="style", style="display: none")
</template>
<script>
import { mapState } from "pinia";
import { useBotStore } from "@/store/bot";
export default {
  data() {
    return {
      textColor: "#fff",
      msgBubbleColorUser: "#fff",
      msgBubbleColorBot: "#000",
      msgBubbleBgBot: "#f0f0f0",
    };
  },
  computed: {
    ...mapState(useBotStore, ["botParameters"]),
    sidebarWidth() {
      return this.$dodoStyles.sidebarWidth;
    },
    msgBubbleBgUser() {
      return this.botParameters.primaryColor;
    },
    style() {
      const styles = `
<style type="text/css" id="dodobot-bot-style">

#chatbot-wrapper {
  display: grid;
  grid-template-columns: 1fr auto; /* Main content takes full width initially */
  min-height: 100vh;

  &:not(:has(#chatbot-sidebar.hidden)) {
    grid-template-columns: 1fr ${this.sidebarWidth}vw;
  }
}

#main-content {
  max-width: 100vw;
  overflow-x: hidden;
}

#chatbot-wrapper:not(:has(#chatbot-sidebar.hidden)) #main-content {
  max-width: calc(100vw - ${this.sidebarWidth}vw);
}

#chatbot-sidebar {
  position: fixed;
  background-color: #f9f9f9;
  max-width: ${this.sidebarWidth}vw;
  transition: right 0.3s ease;
  right: -${this.sidebarWidth}vw;

  &.hidden {
    right: -${this.sidebarWidth}vw;
  }
}

.board-header {
  background: ${
    window.bot_parameters.primaryColor ||
    "linear-gradient(90deg, rgba(100,6,155,1) 0%, rgba(248,139,79,1) 100%)"
  };
}

.board-header__title {
  color: ${this.textColor};
}

.board-content {
  background-color: #fff;
}

.bubble-btn--bot .bubble-btn-component__text {
  color: ${this.msgBubbleColorBot};
  background-color: ${this.msgBubbleBgBot};
}

.bot-msg-bubble__typing-indicator span,
.bot-msg-bubble__typing-indicator::before,
.bot-msg-bubble__typing-indicator::after {
  background-color: ${this.msgBubbleColorBot};
}

.bubble-btn--user .bubble-btn-component__text {
  background-color: ${this.msgBubbleBgUser};
}

.bubble-btn--user .bubble-btn-component__text > p {
  color: ${this.msgBubbleColorUser};
}

.mb-button-options__btn {
  color: ${this.msgBubbleBgUser};
  border-color: ${this.msgBubbleBgUser};

  &:hover {
    color: ${this.msgBubbleColorUser};
    background-color: ${this.msgBubbleBgUser};
  }

  &::before {
    background-color: ${this.msgBubbleBgUser};
  }
}

.mb-button-options__btn.reverse {
  color: ${this.msgBubbleColorUser};
  background-color: ${this.msgBubbleBgUser};

  &:hover {
    color: ${this.msgBubbleBgUser};
    border-color: ${this.msgBubbleBgUser};
    background-color: ${this.msgBubbleColorUser};
  }
}

.bot-avatar {
  background: ${this.msgBubbleBgUser};
}

.board-action--disabled::before {
  background-color: #fff;
}

.el-input__wrapper.is-focus,
.el-textarea__inner:focus {
    box-shadow: 0 0 0 1px ${this.msgBubbleBgUser};
}

.bubble-btn-component__text p {
  margin: 0;
}

.position-toggle {
  color: ${this.msgBubbleBgUser};
  border: 0.15rem solid ${this.msgBubbleBgUser};
  background-color: ${this.msgBubbleColorUser};

  &:hover {
    color: ${this.msgBubbleColorUser};
    background-color: ${this.msgBubbleBgUser};
  }
}

.board-content {
  .el-loading-mask {
    .el-loading-spinner {
      circle {
        stroke: ${this.msgBubbleBgUser}
      }
    }
  }
}

.mb-question-item {
  border-top: 1px solid ${this.msgBubbleBgUser};
}

.nationality-button {
  &:hover {
    border-color: ${this.msgBubbleBgUser};
    background-color: ${this.msgBubbleBgUser};
    }
    
  &.active {
    background-color: ${this.msgBubbleBgUser};
    border-color: ${this.msgBubbleBgUser} ; 
  }
  &.active:hover {
    border-color: white;
  }
}
.search-criteria {
  .search-tag {
    background: ${this.msgBubbleBgUser};
    opacity: 0.9;
  }
}

.recent-chats-list {
  .conversation-item:hover {
    border-color: ${this.msgBubbleBgUser};
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
    transform: translateY(-1px);
  }

  .conversation-item.active {
    border-color: ${this.msgBubbleBgUser};
  }
}

</style>
      `;
      return styles;
    },
  },
};
</script>
