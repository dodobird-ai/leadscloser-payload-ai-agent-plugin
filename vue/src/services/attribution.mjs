const KEY = 'leadscloser:first-touch:v1';
const UTM = { utm_source: 'utmSource', utm_medium: 'utmMedium', utm_campaign: 'utmCampaign', utm_content: 'utmContent', utm_term: 'utmTerm', utm_id: 'utmId' };
const CLICK = /^(gclid|gbraid|wbraid|fbclid|msclkid|dclid|ttclid|twclid|yclid|li_fat_id|sccid|epik|gad_source|gad_campaignid|[a-z0-9_]*click_?id|[a-z0-9_]+clid)$/i;
function bare(href) { const url = new URL(href); return url.origin + url.pathname; }

/** No URL-value normalisation: URLSearchParams only decodes the transport encoding. */
export function parseAttribution(href, referrer = '') {
  const result = { landingPage: href };
  if (referrer) result.referrerUrl = referrer;
  const clickIds = {};
  for (const [key, value] of new URL(href).searchParams) {
    if (!value) continue;
    if (Object.hasOwn(UTM, key) && result[UTM[key]] === undefined) result[UTM[key]] = value;
    else if (CLICK.test(key) && !Object.hasOwn(clickIds, key)) clickIds[key] = value;
  }
  if (Object.keys(clickIds).length) result.clickIds = clickIds;
  return result;
}

export function createAttribution({ context, storage }) {
  let first = parseAttribution(context.landingPage, context.referrerUrl);
  let denied = false;
  function update() {
    if (context.consent === true && !denied) {
      try {
        const stored = JSON.parse(storage.getItem(KEY) || 'null');
        if (stored?.landingPage && /^https?:/.test(stored.landingPage)) first = parseAttribution(stored.landingPage, stored.referrerUrl);
        else storage.setItem(KEY, JSON.stringify({ landingPage: first.landingPage, referrerUrl: first.referrerUrl }));
      } catch { /* Blocked storage must not block the contact action. */ }
    } else if (context.consent === false) {
      first = { landingPage: bare(first.landingPage) };
      context.landingPage = first.landingPage;
      context.referrerUrl = '';
      denied = true;
      try { storage.removeItem(KEY); } catch { /* Storage unavailable. */ }
    }
  }
  update();
  return {
    update,
    get(languageCode) {
      update();
      const attribution = context.consent === true && !denied ? { ...first } : { landingPage: bare(first.landingPage) };
      if (languageCode) attribution.languageCode = languageCode;
      return attribution;
    },
  };
}

let tracker;
export function initializeAttribution() {
  if (tracker || typeof window === 'undefined') return;
  // A host can capture this before asynchronously loading the widget bundle.
  const context = window.leadscloserAttribution ||= { landingPage: window.location.href, referrerUrl: document.referrer, consent: null };
  let storage;
  try { storage = window.sessionStorage; } catch { storage = { getItem: () => null, setItem() {}, removeItem() {} }; }
  tracker = createAttribution({ context, storage });
  window.addEventListener('leadscloser:attribution-consent', () => tracker.update());
}
export function withActionAttribution(url, params, languageCode) {
  if (url.replace(/\/$/, '').split('/').pop() !== 'ask_agent_to_contact_me') return params;
  initializeAttribution();
  return { ...params, attribution: tracker.get(languageCode) };
}
