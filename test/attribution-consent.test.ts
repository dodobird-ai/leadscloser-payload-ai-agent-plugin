import { setChatbotAttributionConsent } from '../src/client.ts'
test('host bridge preserves first page, emits changes, purges identifiers on withdrawal', () => {
 const removeItem = jest.fn(), dispatchEvent = jest.fn()
 Object.assign(globalThis, { window: { leadscloserAttribution: { landingPage: 'https://sir.mu/en?gclid=x#fragment', referrerUrl: 'https://example.org/', consent: null }, sessionStorage: { removeItem }, dispatchEvent } })
 setChatbotAttributionConsent(true)
 expect(window.leadscloserAttribution?.landingPage).toContain('?gclid=x')
 setChatbotAttributionConsent(null)
 expect(window.leadscloserAttribution).toEqual({landingPage:'https://sir.mu/en',referrerUrl:'',consent:false})
 expect(removeItem).toHaveBeenCalledWith('leadscloser:first-touch:v1')
 expect(dispatchEvent).toHaveBeenCalledTimes(2)
 delete (globalThis as any).window
})
