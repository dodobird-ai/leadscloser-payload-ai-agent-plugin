<template>
  <div class="dev-toolbar">
    <span class="dev-title">Dev Tools</span>

    <div class="dynamic-forms-wrapper">
      <div class="dynamic-forms-title">General</div>
      <div class="dynamic-forms-controls">
        <button class="dev-btn" @click="clearCacheKeepTenant">
          Clear Cache
        </button>

        <button
          class="cycle-btn"
          :style="{ backgroundColor: botStates[currentBotState].color }"
          @click="cycleOption"
        >
          {{ botStates[currentBotState].label }}
        </button>
      </div>
    </div>

    <div class="dynamic-forms-wrapper">
      <div class="dynamic-forms-title">Tenant Config</div>
      <div class="dynamic-forms-controls">
        <select
          v-model="selectedTenant"
          class="dev-select"
          @change="onTenantChange"
        >
          <option disabled value="">Select Tenant</option>
          <option
            v-for="(tenant, tenant_name) in tenants"
            :key="tenant_name"
            :value="tenant_name"
            :title="JSON.stringify(tenant)"
          >
            {{ tenant_name }}
          </option>
        </select>
        <button class="dev-btn" @click="reloadConfs">Reload Conf</button>
      </div>
    </div>

    <div class="dynamic-forms-wrapper">
      <div class="dynamic-forms-title">Pinia</div>
      <div class="dynamic-forms-controls">
        <button class="dev-btn" @click="resetState">Reset State</button>
        <button class="dev-btn" @click="dumpState">Dump State</button>
      </div>
    </div>

    <div class="dynamic-forms-wrapper">
      <div class="dynamic-forms-title">Dynamic Forms</div>
      <div class="dynamic-forms-controls">
        <select
          v-model="selectedDynamicForm"
          class="dev-select"
          @change="onDynamicFormChange"
        >
          <option disabled value="">Select Dynamic Form</option>
          <option
            v-for="formKey in [
              ...Object.keys(dynamicForms).filter(
                (key) => key !== 'show' && key !== 'currentForm'
              ),
              'Create New Form',
            ]"
            :key="formKey"
            :value="formKey"
          >
            {{ formKey }}
          </option>
        </select>

        <button class="dev-btn" @click="toggleForm">Toggle Dynamic Form</button>
        <button class="dev-btn" @click="dumpDynamicFormConfig">
          Dump Dynamic Form Config
        </button>
      </div>
    </div>

    <div class="dynamic-forms-wrapper">
      <div class="dynamic-forms-title">Locale</div>
      <div class="dynamic-forms-controls">
        <select class="dev-select">
          <!-- v-model="$i18n.locale" -->
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </div>
    </div>

    <div class="dynamic-forms-wrapper">
      <div class="dynamic-forms-title">Fake Message</div>
      <div class="dynamic-forms-controls">
        <button class="dev-btn" @click="sendFakeMessage">
          Send a Fake Message
        </button>
        <button
          class="cycle-btn"
          :style="{ backgroundColor: statusUseFakeResponseOnError ? '#28a745' : '#dc3545' }"
          @click="toggleFakeResponseOnError"
        >
          {{ statusUseFakeResponseOnError ? 'Fake on Error: ON' : 'Fake on Error: OFF' }}
        </button>
      </div>
    </div>

    <slot></slot>
  </div>
</template>

<script>
import { useBotStore } from "@/store/bot";
import { mapState, mapActions } from "pinia";
import axios from "axios";
import { toRaw } from "vue";
import { fakeMessages } from "@/helpers/fake-messages";
import { botHelper } from "@/helpers/bot";
import { uuidv7 } from "uuidv7";

export default {
  name: "DevToolbar",
  data() {
    return {
      tenants: {},
      selectedTenant: "",
      selectedDynamicForm: "",
      botStates: [
        {
          label: "Closed",
          color: "black",
          fn: () => {
            this.setStatusActive(false);
            localStorage.removeItem("forceOpen");
          },
        },
        {
          label: "Opened",
          color: "#28a745",
          fn: () => {
            this.setStatusActive(true);
            localStorage.removeItem("forceOpen");
          },
        },
        {
          label: "Force open",
          color: "red",
          fn: () => {
            localStorage.setItem("forceOpen", true);
            this.setStatusActive(true);
          },
        },
      ],
      currentBotState: 0,
    };
  },
  async created() {
    const data = await this.getTenants();
    this.tenants = data;

    const DEV_TENANT = localStorage.getItem("DEV_TENANT");
    if (DEV_TENANT) {
      this.selectedTenant = JSON.parse(DEV_TENANT)?.meta?.tenant_name || "";
    }
  },
  mounted() {
    const forceOpen = localStorage.getItem("forceOpen");
    if (forceOpen) {
      this.setStatusActive(true);
      this.currentBotState = 2;
    }
    this.botStates[this.currentBotState].fn();
  },
  computed: {
    ...mapState(useBotStore, ["dynamicForms", "currentForm", "statusActive", "session", "statusUseFakeResponseOnError"]),
  },
  methods: {
    ...mapActions(useBotStore, [
      "reset",
      "toggleDynamicForm",
      "setDynamicForm",
      "setStatusActive",
      "toggleUseFakeResponseOnError",
    ]),

    cycleOption() {
      this.currentBotState = (this.currentBotState + 1) % this.botStates.length;

      this.botStates[this.currentBotState].fn();
    },

    async reloadConfs() {
      const headers = {
        "Content-Type": "application/json",
      };
      const DEV_TENANT = localStorage.getItem("DEV_TENANT");
      headers["Authorization"] = DEV_TENANT ?? "dev-api-key";

      await axios.get(
        `${process.env.VUE_APP_CHATBOT_API_HOSTNAME}/${process.env.VUE_APP_CHATBOT_BACKEND_ROUTE}/reload-conf`,
        {
          headers: headers,
        }
      );
    },
    dumpState() {
      console.log(JSON.stringify(toRaw(useBotStore().$state), null, 2));
    },
    toggleForm() {
      this.toggleDynamicForm(this.selectedDynamicForm);
    },
    dumpDynamicFormConfig() {
      console.log(
        JSON.stringify(toRaw(this.dynamicForms[this.currentForm]), null, 2)
      );
    },
    onDynamicFormChange() {
      if (this.selectedDynamicForm == "Create New Form") {
        window.open("https://builder.vueform.com/demo?v=dev", "_blank");
      } else {
        this.setDynamicForm({
          ...this.dynamicForms,
          currentForm: this.selectedDynamicForm,
        });
        if (!this.statusActive) {
          this.setStatusActive(true);
          this.toggleForm();
        }
      }
    },
    sendFakeMessage() {
      if (!this.statusActive) {
        this.setStatusActive(true);
      }
      const response = fakeMessages[0];
      const res = {
        agent: "bot",
        ...response,
      };
      const store = useBotStore();
      const message_id = uuidv7();
      const conversation_id = this.session.conversationId;
      botHelper.processMessage({
        data: res,
        store,
        message_id,
        conversationId: conversation_id
      });
    },
    clearCacheKeepTenant() {
      // Save DEV_TENANT before clearing
      const devTenant = localStorage.getItem("DEV_TENANT");

      // Clear all storages and caches
      localStorage.clear();
      sessionStorage.clear();
      caches?.keys?.().then((keys) => keys.forEach((k) => caches.delete(k)));

      // Reload the page
      location.reload();

      // Re-apply DEV_TENANT after reload
      if (devTenant) {
        localStorage.setItem("DEV_TENANT", devTenant);
      }
    },

    resetState() {
      useBotStore().reset();
    },
    async getTenants() {
      const response = await axios.get(
        `${process.env.VUE_APP_CHATBOT_API_HOSTNAME}/${process.env.VUE_APP_CHATBOT_BACKEND_ROUTE}/proxy/tenants`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      // Assuming the response is an array of { id, name }
      return response.data.reduce((map, tenant) => {
        map[tenant["meta"]["tenant_name"]] = tenant;
        return map;
      }, {});
    },
    onTenantChange() {
      const selectedTenantObj = this.tenants[this.selectedTenant];
      localStorage.setItem("DEV_TENANT", JSON.stringify(selectedTenantObj));
      this.clearCacheKeepTenant();
    },
    toggleFakeResponseOnError() {
      this.toggleUseFakeResponseOnError();
    },
  },
};
</script>

<style scoped>
.dev-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background-color: #2d2d2d;
  color: white;
  padding: 8px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  font-family: sans-serif !important;
}

.dev-title {
  font-weight: bold;
  margin-right: 8px;
}

.dev-btn {
  background-color: #444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s ease;
}

.dev-btn:hover {
  background-color: #666;
}

.dev-select {
  background-color: #444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

/* New styles for wrapping Dynamic Forms section */
.dynamic-forms-wrapper {
  border: 1px solid #797676;
  border-radius: 6px;
  padding: 8px;
  /* background: #f9f9f9; */
  color: #f4f4f4;
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* min-width: 280px; */
  position: relative;
}

.dynamic-forms-title {
  position: absolute;
  left: 5;
  top: -5px;
  background-color: #2d2d2d;
  padding-left: 4px;
  padding-right: 4px;
  font-weight: bold;
  font-size: 10px;
}

.dynamic-forms-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cycle-btn {
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.3s ease;
}
</style>
