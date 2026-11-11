import { publicOrigin } from './origin.ts'
import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'
import { configurationProblem, reportingURL } from './settings.ts'

export interface ReportingOptions {
  /** Required: host's validated, current analytics consent. Defaults to denied. */
  hasConsent?: (req: PayloadRequest) => boolean | Promise<boolean>
}
const identifier = z.string().min(1).max(200).regex(/^[\w.:-]+$/)
const product = z.object({
  id: identifier, sku: z.string().min(1).max(200).optional(),
  type: z.enum(['recommendation', 'chatbot_image_action']),
  message_id: identifier.optional(), conversation_id: identifier.optional(),
}).strict()
const eventSchema = z.object({
  event_type: z.literal('item_view'), event_dt: z.string().datetime(),
  products: z.array(product).min(1).max(20),
  message_id: identifier.optional(), conversation_id: identifier.optional(),
}).strict()
const reply = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const cookie = (req: PayloadRequest, name: string) => {
  const value = req.headers.get('cookie')?.split(';').find(part => part.trim().startsWith(`${name}=`))?.trim().slice(name.length + 1)
  try { return value ? decodeURIComponent(value) : '' } catch { return '' }
}

export function createReportingEndpoint(options: ReportingOptions = {}): Endpoint {
  // Bounded, per-process abuse guard, not an identity/authentication mechanism.
  const windows = new Map<string, { count: number; until: number }>()
  return { path: '/v1/chatbot/reporting', method: 'post', handler: async req => {
    try {
      const origin = publicOrigin(req)
      if (req.headers.get('origin') !== origin || req.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { error: 'Origin not allowed' })
      if (!await options.hasConsent?.(req)) return reply(403, { error: 'Analytics consent required' })
      if (!req.headers.get('content-type')?.startsWith('application/json')) return reply(415, { error: 'JSON required' })
      if (Number(req.headers.get('content-length') || 0) > 16384) return reply(413, { error: 'Event too large' })
      // Read at most 16 KiB, including requests without Content-Length.
      const reader = req.body?.getReader()
      if (!reader) return reply(400, { error: 'Invalid event' })
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.length
        if (size > 16384) { await reader.cancel(); return reply(413, { error: 'Event too large' }) }
        chunks.push(value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      let input: unknown
      try { input = JSON.parse(new TextDecoder().decode(bytes)) } catch { return reply(400, { error: 'Invalid event' }) }
      const parsed = eventSchema.safeParse(input)
      if (!parsed.success || Math.abs(Date.now() - Date.parse(parsed.data.event_dt)) > 300000) return reply(400, { error: 'Invalid event' })
      const session = identifier.safeParse(cookie(req, 'D_SID'))
      const [visitor, userId] = cookie(req, 'D_ID').split('.')
      if (!session.success || !identifier.safeParse(visitor).success) return reply(400, { error: 'Chat session required' })
      const now = Date.now()
      for (const [key, value] of windows) if (value.until <= now) windows.delete(key)
      const window = windows.get(session.data) || { count: 0, until: now + 60000 }
      if (window.count >= 60 || (!windows.has(session.data) && windows.size >= 10000)) return reply(429, { error: 'Too many events' })
      window.count++; windows.set(session.data, window)
      const settings = await req.payload.findGlobal({ slug: 'chatbot-settings', overrideAccess: true })
      if (!settings.enabled || configurationProblem(settings)) return reply(503, { error: 'Chatbot unavailable' })
      const reportingOrigin = settings.reportingOrigin?.trim()
      const apiKey = settings.reportingApiKey?.trim()
      if (!reportingOrigin || !apiKey) {
        req.payload.logger?.warn('Chatbot reporting skipped: reporting origin or reporting API key is missing in Chatbot Settings.')
        return reply(202, { success: true, skipped: true })
      }
      const target = reportingURL(reportingOrigin)
      const tenantId = settings.reportingTenantId?.trim()
      const headers: Record<string, string> = { Authorization: apiKey, 'Content-Type': 'application/json', 'X-Client-User-Agent': req.headers.get('user-agent') || '' }
      if (tenantId) headers['X-TENANT-ID'] = tenantId
      const event = parsed.data
      const conversation = event.conversation_id || event.products[0].conversation_id
      const ga = cookie(req, '_ga').split('.').slice(2).join('.')
      const response = await fetch(target, {
        method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(2000),
        body: JSON.stringify({ ...event, campaign: settings.campaignId, channel_type: 'website', channel_name: new URL(origin).host,
          session_id: session.data,
          user_identifiers: { dodo_user_id: visitor, user_id: identifier.safeParse(userId).success ? userId : null,
            ...(identifier.safeParse(ga).success ? { ga_user_id: ga } : {}),
          },
          ...(conversation && { conversation_id: conversation, transaction_id: conversation }),
        }),
      })
      if (!response.ok) return reply(502, { error: 'Reporting unavailable' })
      return reply(202, { success: true })
    } catch { return reply(502, { error: 'Reporting unavailable' }) }
  } }
}
