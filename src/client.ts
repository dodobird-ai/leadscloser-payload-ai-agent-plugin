declare global {
  interface Window {
    leadscloserAttribution?: { landingPage: string; referrerUrl: string; consent: boolean | null }
  }
}
// Capture before the async config/asset fetch and before client-side navigation.
if (typeof window !== 'undefined') {
  window.leadscloserAttribution ||= { landingPage: window.location.href, referrerUrl: document.referrer, consent: null }
}
export function setChatbotAttributionConsent(consent: boolean | null) {
  const context = window.leadscloserAttribution ||= { landingPage: window.location.href, referrerUrl: document.referrer, consent: null }
  if (consent === null && context.consent !== null) consent = false
  context.consent = consent
  if (consent === false) {
    const url = new URL(context.landingPage)
    context.landingPage = url.origin + url.pathname
    context.referrerUrl = ''
    try { window.sessionStorage.removeItem('leadscloser:first-touch:v1') } catch { /* Storage unavailable. */ }
  }
  window.dispatchEvent(new Event('leadscloser:attribution-consent'))
}

export interface ChatbotOptions { primaryColor?: string; featuredImage?: string }
const scripts = new Map<string, Promise<void>>()
function loadScript(src: string) {
  const existing = scripts.get(src)
  if (existing) return existing
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      scripts.delete(src)
      reject(new Error('Chatbot asset unavailable'))
    }
    document.body.appendChild(script)
  })
  scripts.set(src, promise)
  return promise
}

export async function startChatbot(options: ChatbotOptions = {}) {
  const response = await fetch('/api/v1/chatbot/config', { cache: 'no-store' })
  if (!response.ok) throw new Error('Chatbot configuration unavailable')
  const settings = await response.json()
  if (!settings.enabled) return
  if (settings.maintenanceMode === 'on' && new URLSearchParams(location.search).get('chatMaintenanceMode') !== 'true') return
  settings.locale = document.documentElement.lang || 'en'
  if (options.featuredImage) settings.featuredImage = options.featuredImage
  if (options.primaryColor) settings.primaryColor = options.primaryColor
  Object.assign(window, { bot_parameters: settings })
  let root = document.getElementById('dodobird-chatbot-root')
  if (!root) {
    root = document.createElement('div')
    root.id = 'dodobird-chatbot-root'
    root.setAttribute('data-lenis-prevent', '')
    root.addEventListener('pointerenter', () => {
      window.dispatchEvent(new Event('leadscloser:chatbot-interaction'))
    })
    // Vue handles these first. Keep bubbling gestures out of the page's hero
    // and smooth-scroll listeners while preserving native scrolling in chat.
    for (const event of ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'pointermove', 'keydown']) {
      root.addEventListener(event, event => event.stopPropagation(), { passive: true })
    }
    document.body.appendChild(root)
  }
  const assetsResponse = await fetch('/chatbot/assets/manifest.json', { cache: 'no-store' })
  if (!assetsResponse.ok) throw new Error('Chatbot manifest unavailable')
  const assets = await assetsResponse.json()
  for (const name of ['chunk-vendors.js', 'app.js']) {
    const file = assets[name]
    if (typeof file !== 'string' || !/^assets\/[a-zA-Z0-9.-]+\.js$/.test(file)) throw new Error('Invalid chatbot asset')
    await loadScript(`/chatbot/${file}`)
  }
}
