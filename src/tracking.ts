/** Chatbot portion of the legacy reporting.js, without jQuery or polling.
 * Capture delegation handles dynamically streamed Vue cards and nested icons.
 * Consent is checked at each event; nothing is queued for later consent.
 */
export interface TrackingOptions {
  hasConsent: () => boolean
  endpoint?: string
}
export function startChatbotTracking({ hasConsent, endpoint = '/api/v1/chatbot/reporting' }: TrackingOptions) {
  const url = new URL(endpoint, window.location.origin)
  if (url.origin !== window.location.origin) throw new Error('Reporting endpoint must be same-origin')
  let lastKey = ''
  let lastTime = 0
  const click = (event: MouseEvent) => {
    if (!hasConsent() || !(event.target instanceof Element)) return
    const target = event.target.closest<HTMLElement>('[data-product_id][data-action]')
    if (!target || !target.closest('#dodobird-chatbot-root') || target.closest('[disabled],[aria-disabled="true"]')) return
    const action = target.dataset.action
    // These are the two event sources wired by the legacy chatbot tracker.
    if (action !== 'view' && action !== 'image') return
    const { product_id: id, sku, message_id, conversation_id } = target.dataset
    if (!id || id === 'undefined' || id === 'null') return
    const key = [action, id, message_id, conversation_id].join(':')
    const now = Date.now()
    if (key === lastKey && now - lastTime < 500) return
    lastKey = key
    lastTime = now
    const product = {
      id, type: action === 'view' ? 'recommendation' : 'chatbot_image_action',
      ...(sku && { sku }), ...(message_id && { message_id }), ...(conversation_id && { conversation_id }),
    }
    // IDs/cookies and campaign are attached server-side. No message text or form data.
    const body = JSON.stringify({ event_type: 'item_view', event_dt: new Date(now).toISOString(), products: [product],
      ...(message_id && { message_id }), ...(conversation_id && { conversation_id }),
    })
    void fetch(url, { method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body,
    }).catch(() => { /* Analytics failures must not interrupt chat or navigation. */ })
  }
  document.addEventListener('click', click, { capture: true, passive: true })
  return () => document.removeEventListener('click', click, true)
}
