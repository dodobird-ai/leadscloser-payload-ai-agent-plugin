import { jest, test, expect, beforeEach, afterEach } from '@jest/globals'
import type { PayloadRequest } from 'payload'
import { createReportingEndpoint } from '../src/reporting'
const settings = { enabled: true, campaignId: 'campaign', apiHostname: 'https://chat.example.com', apiKey: 'private-key', cfSiteKey: 'site-key', cfSecretKey: 'secret-key', reportingOrigin: 'https://reporting.example.com', reportingApiKey: 'reporting-test-key', reportingTenantId: 'tenant-1' }
const event = () => ({ event_type: 'item_view', event_dt: new Date().toISOString(), products: [{ id: '42', sku: 'VILLA-42', type: 'recommendation', message_id: 'message-1', conversation_id: 'conversation-1' }] })
const request = (body: unknown = event(), headers: Record<string, string> = {}) => {
  const req = new Request('https://site.example/api/v1/chatbot/reporting', { method: 'POST', headers: {
    origin: 'https://site.example', 'content-type': 'application/json', cookie: 'D_SID=session-1; D_ID=visitor-1.user-1; _ga=GA1.1.123.456', ...headers,
  }, body: typeof body === 'string' ? body : JSON.stringify(body) })
  return Object.assign(req, { payload: { logger: { warn: jest.fn() }, findGlobal: jest.fn<() => Promise<typeof settings>>().mockResolvedValue(settings) } }) as unknown as PayloadRequest
}
const originalFetch = global.fetch
beforeEach(() => { global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 202 })) })
afterEach(() => { global.fetch = originalFetch })
const handler = () => createReportingEndpoint({ hasConsent: () => true }).handler

test('forwards the original reporting contract without exposing the key', async () => {
  const response = await handler()(request())
  expect(response.status).toBe(202)
  const [url, init] = (global.fetch as jest.Mock<typeof fetch>).mock.calls[0]
  expect(String(url)).toBe('https://reporting.example.com/api/reporting')
  expect(init!.headers).toMatchObject({ Authorization: 'reporting-test-key', 'X-TENANT-ID': 'tenant-1' })
  expect(init!.redirect).toBe('error')
  expect(JSON.parse(init!.body as string)).toMatchObject({ campaign: 'campaign', event_type: 'item_view', channel_type: 'website', channel_name: 'site.example', session_id: 'session-1', transaction_id: 'conversation-1', user_identifiers: { dodo_user_id: 'visitor-1', user_id: 'user-1', ga_user_id: '123.456' } })
  expect(await response.text()).not.toContain('private-key')
})
test('consent defaults to denied and rejection never reaches upstream', async () => {
  expect((await createReportingEndpoint().handler(request())).status).toBe(403)
  expect((await createReportingEndpoint({ hasConsent: () => false }).handler(request())).status).toBe(403)
  expect(global.fetch).not.toHaveBeenCalled()
})
test('rejects cross-origin and missing origin requests', async () => {
  for (const origin of ['', 'https://attacker.example']) expect((await handler()(request(event(), { origin }))).status).toBe(403)
  expect(global.fetch).not.toHaveBeenCalled()
})
test('rejects invalid, stale, extra-field and oversized events', async () => {
  for (const body of ['{', { ...event(), event_type: 'purchase' }, { ...event(), email: 'not-collected@example.com' }, { ...event(), event_dt: '2020-01-01T00:00:00.000Z' }]) {
    expect((await handler()(request(body))).status).toBe(400)
  }
  expect((await handler()(request(' '.repeat(17000)))).status).toBe(413)
  expect(global.fetch).not.toHaveBeenCalled()
})
test('requires existing chatbot session cookies', async () => {
  expect((await handler()(request(event(), { cookie: '' }))).status).toBe(400)
  expect(global.fetch).not.toHaveBeenCalled()
})
test('disabled chatbot does not report', async () => {
  const req = request()
  ;(req.payload.findGlobal as jest.Mock<() => Promise<typeof settings>>).mockResolvedValue({ ...settings, enabled: false })
  expect((await handler()(req)).status).toBe(503)
  expect(global.fetch).not.toHaveBeenCalled()
})
test('rate limits repeated requests', async () => {
  const handle = handler()
  for (let i = 0; i < 60; i++) expect((await handle(request())).status).toBe(202)
  expect((await handle(request())).status).toBe(429)
  expect(global.fetch).toHaveBeenCalledTimes(60)
})
test('upstream errors stay private', async () => {
  ;(global.fetch as jest.Mock<typeof fetch>).mockRejectedValue(new Error('private-key'))
  const response = await handler()(request())
  expect(response.status).toBe(502)
  expect(await response.text()).not.toContain('private-key')
})

test('uses configured public origin behind a proxy, not internal URL or forwarded headers', async () => {
  const req = request(event(), { origin: 'https://sir.mu', 'x-forwarded-host': 'attacker.example' })
  Object.assign(req.payload, { config: { serverURL: 'https://sir.mu' } })
  expect((await handler()(req)).status).toBe(202)
  const [, init] = (global.fetch as jest.Mock<typeof fetch>).mock.calls[0]
  expect(JSON.parse(init!.body as string).channel_name).toBe('sir.mu')
  const denied = request(event(), { origin: 'https://attacker.example', 'x-forwarded-host': 'attacker.example' })
  Object.assign(denied.payload, { config: { serverURL: 'https://sir.mu' } })
  expect((await handler()(denied)).status).toBe(403)
})


test('Payload reporting settings take precedence over legacy environment variables', async () => {
  process.env.LEADSCLOSER_REPORTING_ORIGIN = 'https://wrong.example.com'
  process.env.LEADSCLOSER_REPORTING_API_KEY = 'wrong-key'
  process.env.LEADSCLOSER_TENANT_ID = 'wrong-tenant'
  try {
    expect((await handler()(request())).status).toBe(202)
    const [url, init] = jest.mocked(fetch).mock.calls[0]
    expect(String(url)).toBe('https://reporting.example.com/api/reporting')
    expect(init!.headers).toMatchObject({ Authorization: 'reporting-test-key', 'X-TENANT-ID': 'tenant-1' })
  } finally {
    delete process.env.LEADSCLOSER_REPORTING_ORIGIN
    delete process.env.LEADSCLOSER_REPORTING_API_KEY
    delete process.env.LEADSCLOSER_TENANT_ID
  }
})
test.each(['reportingOrigin', 'reportingApiKey'])('missing %s skips forwarding, logs safely, and never uses chat credentials', async field => {
  const req = request()
  jest.mocked(req.payload.findGlobal).mockResolvedValue({ ...settings, [field]: '' } as never)
  const response = await handler()(req)
  expect(await response.json()).toEqual({ success: true, skipped: true })
  expect(fetch).not.toHaveBeenCalled()
  expect(req.payload.logger.warn).toHaveBeenCalledWith(expect.stringContaining('reporting origin or reporting API key is missing'))
  expect(JSON.stringify(jest.mocked(req.payload.logger.warn).mock.calls)).not.toContain('private-key')
})
test('tenant header is absent unless configured', async () => {
  const req = request()
  jest.mocked(req.payload.findGlobal).mockResolvedValue({ ...settings, reportingTenantId: '' } as never)
  await handler()(req)
  expect(jest.mocked(fetch).mock.calls[0][1]!.headers).not.toHaveProperty('X-TENANT-ID')
})
test('HTTP reporting is rejected even with local mock mode', async () => {
  process.env.CHATBOT_MOCK = 'true'
  try {
    const req = request()
    jest.mocked(req.payload.findGlobal).mockResolvedValue({ ...settings, reportingOrigin: 'http://127.0.0.1:6791' } as never)
    expect((await handler()(req)).status).toBe(502)
    expect(fetch).not.toHaveBeenCalled()
  } finally { delete process.env.CHATBOT_MOCK }
})
