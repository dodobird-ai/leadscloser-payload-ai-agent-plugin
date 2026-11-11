import { publicOrigin } from './origin.ts'
import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'
import { configurationProblem, importWordPressOptions, publicSettings, upstreamURL, reportingURL, mockEnabled } from './settings.ts'

const tokenSchema = z.object({ token: z.string().min(1), expires_at: z.number().positive() }).passthrough()
const provisionSchema = z.object({ campaign_id: z.string().min(1), cf_site_key: z.string().min(1), cf_secret_key: z.string().min(1), reporting_origin: z.string().optional(), reporting_tenant_id: z.string().optional(), tenant_id: z.string().optional() })
export const json = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
})
const readSettings = (req: PayloadRequest) => req.payload.findGlobal({ slug: 'chatbot-settings', overrideAccess: true })

async function upstream(req: PayloadRequest, route: string) {
  const settings = await readSettings(req)
  if (!settings.apiKey?.trim()) throw new Error('Missing credential')
  const response = await fetch(upstreamURL(settings.apiHostname || '', route), {
    headers: {
      Authorization: settings.apiKey,
      'Content-Type': 'application/json',
      'X-Client-User-Agent': req.headers.get('user-agent') || '',
    },
    signal: AbortSignal.timeout(30000), cache: 'no-store', redirect: 'error',
  })
  if (!response.ok) throw new Error('Upstream rejected request')
  return (await response.json()).value
}

async function proxy(req: PayloadRequest) {
  try {
    const settings = await readSettings(req)
    if (!settings.enabled || configurationProblem(settings)) return json({ error: 'Chatbot unavailable' }, 503)
    const action = new URL(req.url!).searchParams.get('action')
    if (action === 'dodo_chat_auth' && req.method === 'GET') {
      const token = tokenSchema.parse(await upstream(req, '/api/v1/auth/'))
      if (token.expires_at * 1000 <= Date.now()) return json({ error: 'Authentication unavailable' }, 502)
      return json(token)
    }
    if (action === 'verify_cf_turnstile' && req.method === 'POST') {
      let body: unknown
      try { body = await req.json!() } catch { return json({ success: false, error: 'Invalid JSON' }, 400) }
      const parsed = z.object({ 'cf-turnstile-response': z.string().min(1).max(2048) }).safeParse(body)
      if (!parsed.success) return json({ success: false, error: 'Invalid challenge' }, 400)
      const form = new URLSearchParams({ secret: settings.cfSecretKey!, response: parsed.data['cf-turnstile-response'] })
      // Opt in only behind a proxy that overwrites these client-supplied headers.
      if (process.env.CHATBOT_TRUST_PROXY === 'true') {
        const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        if (ip) form.set('remoteip', ip)
      }
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: form, signal: AbortSignal.timeout(10000), redirect: 'error',
      })
      if (!response.ok) return json({ success: false, error: 'Verification unavailable' }, 502)
      const verified = await response.json()
      if (typeof verified?.success !== 'boolean') return json({ success: false, error: 'Verification unavailable' }, 502)
      return json(verified)
    }
    return json({ error: 'Unsupported action' }, 400)
  } catch {
    // Upstream bodies may include credentials or internal diagnostics.
    return json({ error: 'Chatbot service unavailable', success: false }, 502)
  }
}

async function importSettings(req: PayloadRequest) {
  if (req.user?.role !== 'admin') return json({ error: 'Administrator access required' }, 403)
  // Payload custom handlers need their own origin check for cookie-authenticated writes.
  const origin = req.headers.get('origin')
  if (origin && origin !== publicOrigin(req)) return json({ error: 'Origin not allowed' }, 403)
  try {
    const data = importWordPressOptions(z.record(z.string(), z.unknown()).parse(await req.json!()))
    await req.payload.updateGlobal({ slug: 'chatbot-settings', data, req, overrideAccess: false })
    return json({ success: true })
  } catch {
    return json({ error: 'Settings could not be imported. Check the option values and required fields.' }, 400)
  }
}

async function sync(req: PayloadRequest) {
  if (req.user?.role !== 'admin') return json({ error: 'Administrator access required' }, 403)
  const origin = req.headers.get('origin')
  if (origin && origin !== publicOrigin(req)) return json({ error: 'Origin not allowed' }, 403)
  try {
    const settings = provisionSchema.parse(await upstream(req, '/api/v1/request-settings/'))
    const saved = await readSettings(req)
    const data: Record<string, string> = { campaignId: settings.campaign_id, cfSiteKey: settings.cf_site_key, cfSecretKey: settings.cf_secret_key }
    // Local preview must not replace its test challenge with production credentials.
    if (mockEnabled() && ['1x00000000000000000000AA', '1x00000000000000000000BB'].includes(saved.cfSiteKey || '')) {
      delete data.cfSiteKey
      delete data.cfSecretKey
    }
    // Optional metadata may prefill blanks; never overwrite operator settings or import a reporting key.
    if (!saved.reportingOrigin && settings.reporting_origin) {
      try { reportingURL(settings.reporting_origin); data.reportingOrigin = settings.reporting_origin } catch { /* Ignore invalid optional metadata. */ }
    }
    const tenant = settings.reporting_tenant_id || settings.tenant_id
    if (!saved.reportingTenantId && tenant && /^[\w.:-]{1,200}$/.test(tenant)) data.reportingTenantId = tenant
    await req.payload.updateGlobal({ slug: 'chatbot-settings', req, overrideAccess: false, data })
    return json({ success: true })
  } catch {
    return json({ error: 'Backend settings could not be synchronized. Check the saved API origin and key.' }, 502)
  }
}

export const chatbotEndpoints: Endpoint[] = [
  { path: '/v1/chatbot/config', method: 'get', handler: async req => {
    try { return json(publicSettings(await readSettings(req))) } catch { return json({ enabled: false }, 503) }
  } },
  { path: '/v1/chatbot/proxy', method: 'get', handler: proxy },
  { path: '/v1/chatbot/proxy', method: 'post', handler: proxy },
  { path: '/v1/chatbot/sync', method: 'post', handler: sync },
  { path: '/v1/chatbot/import', method: 'post', handler: importSettings },
]
