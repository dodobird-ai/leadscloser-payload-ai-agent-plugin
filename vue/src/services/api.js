import axios from "axios";
import { useBotStore } from "@/store/bot";

const backendBaseURL =
  (process.env.NODE_ENV === "development"
    ? process.env.VUE_APP_CHATBOT_API_HOSTNAME
    : window.bot_parameters.apiHostname) +
  "/" +
  process.env.VUE_APP_CHATBOT_BACKEND_ROUTE;

const proxyBaseURL =
  process.env.VUE_APP_DEV_AUTH_PROXY !== "false"
    ? process.env.VUE_APP_CHATBOT_API_HOSTNAME +
    "/" +
    process.env.VUE_APP_CHATBOT_BACKEND_ROUTE +
    "/proxy"
    : window.location.origin + "/" + process.env.VUE_APP_CHATBOT_PROXY_ROUTE;

const backendAxiosInstance = axios.create({
  baseURL: backendBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const backendFetchInstance = {
  baseURL: backendBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
};

const proxyAxiosInstance = axios.create({
  baseURL: proxyBaseURL,
  headers: {
    "Content-Type": "application/json",
    Authorization:
      process.env.NODE_ENV === "development"
        ? localStorage.getItem("DEV_TENANT") ?? "dev-api-key"
        : undefined,
  },
});

const setupAuthorizationBackendHTTPClientInstances = () => {
  const botStore = useBotStore();
  const authToken = botStore.session.authToken.token;

  if (authToken) {
    backendAxiosInstance.defaults.headers.common["Authorization"] = authToken;
    backendFetchInstance.headers["Authorization"] = authToken;
  } else {
    delete backendAxiosInstance.defaults.headers.common["Authorization"];
    delete backendFetchInstance.headers["Authorization"];
  }
};

class BaseApiService {
  constructor(instance, path = "") {
    if (!instance) {
      throw new Error("HTTP client instance is required");
    }
    this.instance = instance;
    this.path = path;
  }
}

class AxiosApiService extends BaseApiService {
  constructor(instance, path) {
    super(instance, path);
  }

  async makeRequest(requestConfig) {
    const res = await this.instance.request({
      ...requestConfig,
      url: this.path + (requestConfig.url ? `/${requestConfig.url}` : ""),
    });
    return res;
  }
}

class FetchApiService extends BaseApiService {
  constructor(instance, path) {
    super(instance, path);
  }

  async makeRequest(requestConfig) {
    const res = await fetch(this.instance.baseURL + this.path, {
      method: requestConfig.method || "GET",
      headers: this.instance.headers,
      body: JSON.stringify(requestConfig.data) || null,
    });
    return res;
  }
}

const buildApis = (config) => {
  const result = {};

  for (const rootKey in config) {
    const { instance, routes } = config[rootKey];
    result[rootKey] = buildRoutes(routes, instance, "", rootKey);
  }

  return result;
};

const buildRoutes = (routes, instance, parentPath = "", rootKey = "") => {
  const result = {};
  const isUnderProxy = rootKey === "proxy";

  for (const key in routes) {
    const value = routes[key];
    const isLeaf = Object.keys(value).length === 0;
    const isFetch = key.startsWith("FETCH_");

    const serviceKey = isFetch ? key.replace(/^FETCH_/, "") : key;
    const path = isUnderProxy ? "" : `${parentPath}/${serviceKey}`;

    if (isLeaf) {
      const ServiceClass = isFetch ? FetchApiService : AxiosApiService;
      const serviceInstance = isFetch ? backendFetchInstance : instance;
      result[serviceKey] = new ServiceClass(serviceInstance, path);
    } else {
      result[serviceKey] = buildRoutes(value, instance, path);
    }
  }

  return result;
}

const $api = buildApis({
  proxy: {
    instance: proxyAxiosInstance,
    routes: {
      auth: {},
      addToCart: {},
      fetchRecommendationData: {},
      verifyCFlareTurnstile: {},
    },
  },
  backend: {
    instance: backendAxiosInstance,
    routes: {
      conversation: {
        clear: {},
        FETCH_message: {},
        "FETCH_internal-message": {},
      },
      telemetry: {},
      action: {},
      search: {},  // For /search/{search_id}?page=2&sort=price&direction=ASC
      tenants: {},  // For /tenants/{tenant}/forms, use: $api.backend.tenants.makeRequest({ url: "{tenant}/forms" })
    },
  },
});

export { $api, setupAuthorizationBackendHTTPClientInstances };
