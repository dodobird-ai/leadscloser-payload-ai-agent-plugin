import { APIError, type Config, type GlobalConfig } from 'payload'
import { isAdmin, isAdminFieldLevel } from './access.ts'
import { chatbotEndpoints } from './endpoints.ts'
import { configurationProblem, suggestionsSchema, upstreamURL } from './settings.ts'

const secretAdmin = {
  description: 'Server-only credential. Accessible only to administrators.',
  components: { Field: '@dodobird-ai/leadscloser-payload-ai-agent-plugin/admin#SecretField' },
}

export const chatbotSettings: GlobalConfig = {
  slug: 'chatbot-settings',
  label: 'LeadsCloser Chatbot Settings',
  admin: { group: 'LeadsCloser' },
  access: { read: isAdmin, update: isAdmin },
  hooks: { beforeValidate: [({ data, originalDoc }) => {
    const merged = { ...originalDoc, ...data }
    const problem = configurationProblem(merged)
    if (problem) throw new APIError(problem, 400)
    return data
  }] },
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false },
    { name: 'campaignId', type: 'text', defaultValue: '' },
    { name: 'apiHostname', type: 'text', defaultValue: '', validate: (value: string | null | undefined) => {
      if (!value) return true
      try { upstreamURL(value, '/'); return true } catch { return 'Enter an HTTPS origin. Local HTTP requires mock mode.' }
    } },
    { name: 'apiKey', type: 'text', access: { read: isAdminFieldLevel, update: isAdminFieldLevel }, admin: secretAdmin },
    { name: 'cfSiteKey', type: 'text' },
    { name: 'cfSecretKey', type: 'text', access: { read: isAdminFieldLevel, update: isAdminFieldLevel }, admin: secretAdmin },
    { name: 'provisioning', type: 'ui', admin: { components: { Field: '@dodobird-ai/leadscloser-payload-ai-agent-plugin/admin#ProvisionSettings' } } },
    { name: 'maintenanceMode', type: 'checkbox', defaultValue: false, admin: { description: 'Preview with ?chatMaintenanceMode=true. This controls visibility and is not an authorization gate.' } },
    { name: 'botTitle', type: 'text', defaultValue: 'AI Assistant' },
    { name: 'primaryColor', type: 'text', defaultValue: '#002349', validate: (value: string | null | undefined) => !value || /^#[\da-f]{3}([\da-f]{3})?$/i.test(value) || 'Use a hexadecimal color.' },
    { name: 'featuredImage', type: 'text', validate: (value: string | null | undefined) => {
      if (!value) return true
      try { return new URL(value).protocol === 'https:' || 'Use an HTTPS image URL.' } catch { return 'Use an HTTPS image URL.' }
    } },
    { name: 'inputSuggestions', type: 'json', defaultValue: [], validate: (value: unknown) => suggestionsSchema.safeParse(value ?? []).success || 'Use an array of suggestions with id, group_id and localized text.' },
  ],
}

export const dodobirdChatbotPlugin = () => (config: Config): Config => {
  if (config.globals?.some(global => global.slug === chatbotSettings.slug)) throw new Error('Chatbot plugin is already registered')
  return {
    ...config,
    globals: [...(config.globals || []), chatbotSettings],
    endpoints: [...(config.endpoints || []), ...chatbotEndpoints],
  }
}

/** Preferred public name. Legacy export remains compatible with existing installations. */
export const leadsCloserChatbotPlugin = dodobirdChatbotPlugin
