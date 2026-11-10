import { z } from 'zod'
import type { ChatbotSetting } from './types.ts'

export const mockEnabled = () => process.env.CHATBOT_MOCK === 'true' && process.env.NODE_ENV !== 'production'

export const upstreamURL = (hostname: string, route: string) => {
  const url = new URL(hostname)
  const local = mockEnabled() && url.hostname === '127.0.0.1'
  if ((url.protocol !== 'https:' && !local) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Use an HTTPS API origin, without credentials, path, query, or fragment.')
  }
  return new URL(route, url)
}

export const suggestionsSchema = z.array(z.object({
  id: z.union([z.string(), z.number()]),
  group_id: z.union([z.string(), z.number()]),
  text: z.record(z.string(), z.string()),
  next_options: z.array(z.union([z.string(), z.number()])).optional(),
}).passthrough())

export function configurationProblem(settings: Partial<ChatbotSetting>): string | undefined {
  if (!settings.enabled) return
  for (const field of ['campaignId', 'apiHostname', 'apiKey', 'cfSiteKey', 'cfSecretKey'] as const) {
    if (!settings[field]?.trim()) return `${field} is required when the chatbot is enabled.`
  }
  try { upstreamURL(settings.apiHostname!, '/') } catch { return 'The chatbot API must use a valid HTTPS origin.' }
  if (!mockEnabled() && (['1x00000000000000000000AA', '1x00000000000000000000BB'].includes(settings.cfSiteKey || '') || settings.cfSecretKey === '1x0000000000000000000000000000000AA')) {
    return 'Turnstile test keys require the development mock environment.'
  }
}

export function publicSettings(settings: ChatbotSetting) {
  if (!settings.enabled || configurationProblem(settings)) return { enabled: false }
  return {
    enabled: true,
    campaignId: settings.campaignId,
    apiHostname: settings.apiHostname,
    cfSiteKey: settings.cfSiteKey,
    maintenanceMode: settings.maintenanceMode ? 'on' : 'off',
    autoFetchRecommendation: 'off',
    title: settings.botTitle,
    view: 'chatbot',
    locale: 'en',
    geoFilterMode: 'off',
    proxyBaseURL: '/api/v1/chatbot/proxy',
    primaryColor: settings.primaryColor,
    featuredImage: settings.featuredImage,
    inputSuggestionsJSON: settings.inputSuggestions || [],
  }
}

const optionNames = {
  campaign_id: 'campaignId', api_hostname: 'apiHostname', api_key: 'apiKey',
  cf_site_key: 'cfSiteKey', cf_secret_key: 'cfSecretKey', title: 'botTitle',
  primary_color: 'primaryColor', featured_image_url: 'featuredImage',
} as const

/** Accept a WordPress option-name/value object. Never infer enablement on import. */
export function importWordPressOptions(options: Record<string, unknown>): Partial<ChatbotSetting> {
  const result: Partial<ChatbotSetting> = {}
  for (const [source, target] of Object.entries(optionNames)) {
    const value = options[`dodobirdai_chatbot_${source}`]
    if (value !== undefined) {
      if (typeof value !== 'string') throw new Error(`Invalid ${source}`)
      result[target as typeof optionNames[keyof typeof optionNames]] = value
    }
  }
  const maintenance = options.dodobirdai_chatbot_maintenance_mode
  if (maintenance !== undefined) result.maintenanceMode = maintenance === 'on'
  const suggestions = options.dodobirdai_chatbot_input_suggestion_json
  if (suggestions !== undefined) {
    result.inputSuggestions = suggestionsSchema.parse(typeof suggestions === 'string' ? JSON.parse(suggestions || '[]') : suggestions)
  }
  if (Object.keys(result).length === 0) throw new Error('No recognized chatbot options')
  return result
}
