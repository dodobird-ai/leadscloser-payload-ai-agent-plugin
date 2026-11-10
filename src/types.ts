export interface ChatbotSetting {
  id: number;
  enabled?: boolean | null;
  campaignId?: string | null;
  apiHostname?: string | null;
  /**
   * Server-only credential. Accessible only to administrators.
   */
  apiKey?: string | null;
  cfSiteKey?: string | null;
  /**
   * Server-only credential. Accessible only to administrators.
   */
  cfSecretKey?: string | null;
  /**
   * Preview with ?chatMaintenanceMode=true. This controls visibility and is not an authorization gate.
   */
  maintenanceMode?: boolean | null;
  botTitle?: string | null;
  primaryColor?: string | null;
  featuredImage?: string | null;
  inputSuggestions?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}
