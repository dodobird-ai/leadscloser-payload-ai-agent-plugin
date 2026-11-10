import { jest, test, expect, beforeEach, afterEach } from '@jest/globals'
import { configurationProblem, importWordPressOptions, publicSettings, upstreamURL } from '../src/settings'
import { chatbotEndpoints } from '../src/endpoints'
import type { PayloadRequest } from 'payload'
import type { ChatbotSetting } from '../src/types'

const settings = {
  id: 1, enabled: true, campaignId: 'campaign', apiHostname: 'https://chat.example.com',
  apiKey: 'private-key', cfSiteKey: 'public-site-key', cfSecretKey: 'private-secret',
  inputSuggestions: [],
} as ChatbotSetting
const req = (overrides = {}) => ({
  url: 'https://site.example/api/v1/chatbot/proxy?action=dodo_chat_auth', method: 'GET',
  headers: new Headers(), payload: { findGlobal: jest.fn<() => Promise<ChatbotSetting>>().mockResolvedValue(settings), updateGlobal: jest.fn() },
  ...overrides,
}) as unknown as PayloadRequest
const endpoint = (path: string, method = 'post') => chatbotEndpoints.find(e => e.path.endsWith(path) && e.method === method)!.handler
const originalFetch = global.fetch
beforeEach(() => { global.fetch = jest.fn<typeof fetch>(); delete process.env.CHATBOT_MOCK })
afterEach(() => { global.fetch = originalFetch })

test('public configuration excludes credentials', () => {
  const serialized = JSON.stringify(publicSettings(settings))
  expect(serialized).not.toContain('private-key')
  expect(serialized).not.toContain('private-secret')
  expect(publicSettings(settings)).toMatchObject({ enabled: true, autoFetchRecommendation: 'off' })
})
test('disabled or incomplete configuration fails closed', () => {
  expect(publicSettings({ ...settings, enabled: false })).toEqual({ enabled: false })
  expect(publicSettings({ ...settings, apiKey: '' })).toEqual({ enabled: false })
  expect(configurationProblem({ ...settings, cfSecretKey: '' })).toContain('cfSecretKey')
})
test('upstream URLs reject credentials, non-HTTPS, and embedded paths', () => {
  for (const host of ['http://chat.example.com', 'https://user:password@chat.example.com', 'https://chat.example.com/path', 'https://chat.example.com?key=x']) {
    expect(() => upstreamURL(host, '/api/v1/auth/')).toThrow()
  }
})
test('mock origins require explicit development opt-in', () => {
  expect(() => upstreamURL('http://127.0.0.1:6791', '/')).toThrow()
  process.env.CHATBOT_MOCK = 'true'
  expect(upstreamURL('http://127.0.0.1:6791', '/').port).toBe('6791')
})
test('imports only recognized WordPress options and preserves enablement', () => {
  expect(importWordPressOptions({ dodobirdai_chatbot_api_key: 'key', dodobirdai_chatbot_title: 'Title', enabled: true })).toEqual({ apiKey: 'key', botTitle: 'Title' })
  expect(() => importWordPressOptions({ dodobirdai_chatbot_input_suggestion_json: '{' })).toThrow()
})
test.each(['sync', 'import'])('rejects anonymous and editor %s requests', async path => {
  for (const role of [undefined, 'editor']) {
    const response = await endpoint(path)(req({ user: role ? { role } : undefined }))
    expect(response.status).toBe(403)
  }
  expect(global.fetch).not.toHaveBeenCalled()
})
test('rejects cross-origin admin writes', async () => {
  const response = await endpoint('sync')(req({ user: { role: 'admin' }, headers: new Headers({ Origin: 'https://evil.example' }) }))
  expect(response.status).toBe(403)
})
test('preserves token contract and raw upstream authorization', async () => {
  const value = { token: 'temporary-token', expires_at: Math.floor(Date.now() / 1000) + 120 }
  jest.mocked(fetch).mockResolvedValue(Response.json({ value }))
  const response = await endpoint('proxy', 'get')(req())
  expect(await response.json()).toEqual(value)
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(fetch).toHaveBeenCalledWith(new URL('https://chat.example.com/api/v1/auth/'), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'private-key' }), redirect: 'error' }))
})
test('rejects malformed and expired upstream tokens without leaking details', async () => {
  for (const value of [{ token: 'bad', expires_at: 1 }, { secret: 'private-key' }]) {
    jest.mocked(fetch).mockResolvedValue(Response.json({ value }))
    const response = await endpoint('proxy', 'get')(req())
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('private-key')
  }
})
test('failed provisioning leaves persisted settings untouched', async () => {
  jest.mocked(fetch).mockResolvedValue(Response.json({ value: { campaign_id: 'partial' } }))
  const request = req({ user: { role: 'admin' } })
  expect((await endpoint('sync')(request)).status).toBe(502)
  expect(request.payload.updateGlobal).not.toHaveBeenCalled()
})
test('complete provisioning updates through Payload access control', async () => {
  jest.mocked(fetch).mockResolvedValue(Response.json({ value: { campaign_id: 'new', cf_site_key: 'site', cf_secret_key: 'secret' } }))
  const request = req({ user: { role: 'admin' } })
  expect((await endpoint('sync')(request)).status).toBe(200)
  expect(request.payload.updateGlobal).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false, data: { campaignId: 'new', cfSiteKey: 'site', cfSecretKey: 'secret' } }))
})
test('malformed captcha JSON is rejected before contacting Cloudflare', async () => {
  const response = await endpoint('proxy')(req({ method: 'POST', url: 'https://site.example/api/v1/chatbot/proxy?action=verify_cf_turnstile', json: async () => { throw new Error() } }))
  expect(response.status).toBe(400)
  expect(fetch).not.toHaveBeenCalled()
})
test('production refuses mock origins and test credentials even with mock flag', () => {
  const previous = process.env.NODE_ENV
  Object.assign(process.env, { NODE_ENV: 'production' })
  process.env.CHATBOT_MOCK = 'true'
  try {
    expect(() => upstreamURL('http://127.0.0.1:6791', '/')).toThrow()
    expect(configurationProblem({ ...settings, cfSiteKey: '1x00000000000000000000AA' })).toContain('test keys')
  } finally { Object.assign(process.env, { NODE_ENV: previous }) }
})
test('negative Cloudflare verification stays negative', async () => {
  jest.mocked(fetch).mockResolvedValue(Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] }))
  const response = await endpoint('proxy')(req({ method: 'POST', url: 'https://site.example/api/v1/chatbot/proxy?action=verify_cf_turnstile', json: async () => ({ 'cf-turnstile-response': 'challenge' }) }))
  expect(await response.json()).toEqual({ success: false, 'error-codes': ['timeout-or-duplicate'] })
})
