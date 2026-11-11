# LeadsCloser Payload AI Agent Plugin

Native Payload CMS 3 settings and server endpoints for the existing Vue AI chatbot. The Vue source is included statically in `vue/`, with its dependency lockfile and build tooling; no private Git dependency or WordPress installation is required. A configured LeadsCloser backend is required for real conversations.

## Install and integrate

This repository is the source distribution (not yet published on npm). Clone it and install its dependencies, then install it in your Payload/Next application using a local package path:

```sh
npm install
npm --prefix vue ci
npm run build:widget -- /absolute/path/to/your-app/public/chatbot
# In your app:
npm install /absolute/path/to/leadscloser-payload-ai-agent-plugin
```

```ts
import { leadsCloserChatbotPlugin } from '@dodobird-ai/leadscloser-payload-ai-agent-plugin'
// Payload configuration:
plugins: [leadsCloserChatbotPlugin()],
routes: { api: '/api/v1' },
```

Mount `Chatbot` from `@dodobird-ai/leadscloser-payload-ai-agent-plugin/client` once in your public React layout. Add the package to Next's `transpilePackages` because the package exports TypeScript source. Generate Payload types, its admin import map, and a migration for your database adapter after registration. Apply migrations before deployment. The plugin uses a `chatbot-settings` global and reserves `/chatbot/config`, `/chatbot/proxy`, `/chatbot/sync`, and `/chatbot/import` under the Payload API prefix. Currently the browser integration requires `/api/v1`.

Verified in the consuming application with Payload 3.84.1, Next.js 15.4.11 and React 19.2.6. Database migrations belong to the consuming application; there is no database-adapter-specific migration in this package.

## Settings and access

Users with `role: 'admin'` can read/update the settings and invoke synchronization or import. Other roles and anonymous users cannot. Use this role contract in the host auth collection. Save the backend HTTPS origin and API key with the chatbot disabled, then use **Sync backend settings** to provision campaign ID and Turnstile site/secret keys. Review title, primary color, image and suggestions, then enable.

Public configuration explicitly excludes server secrets. Token exchange forwards the server API key to `/api/v1/auth/` and returns the existing expiring browser token contract. Vue retains token renewal, streaming conversations and session history. Turnstile verification uses Cloudflare Siteverify on the server. Backend provisioning calls `/api/v1/request-settings/`. Redirects are refused and upstream requests have timeouts. Import accepts the original WordPress chatbot option-name/value map. Administrator writes require a matching request origin.

`CHATBOT_MOCK=true` permits loopback HTTP and Turnstile test keys only outside production. `CHATBOT_TRUST_PROXY=true` enables visitor-IP forwarding; use it only behind a proxy that replaces incoming forwarded headers. Secrets are masked in the admin interface, but are normal persisted database fields accessible to administrators.

## Styling and launcher

The package includes the Vue widget's baseline styling and original launcher artwork. Site branding is separate: apply a host stylesheet scoped to `#dodobird-chatbot-root`. No MSIR theme or generated MaxAI artwork is required by this package. For a custom host mount, `startChatbot` from the `/loader` export accepts optional `primaryColor` and `featuredImage` overrides. Never put server credentials in these options.

The mount has `data-lenis-prevent` and isolates bubbling chat gestures. It dispatches `leadscloser:chatbot-interaction` on pointer entry, allowing a host to cancel hero autoplay/smooth scrolling. The consuming website owns that integration.

## Source snapshot and tests

`vue/` is a static snapshot of the LeadsCloser Vue chatbot integrated for Payload. It is intentionally not a submodule. Update it explicitly and rebuild widget assets. The widget includes property cards, detail previews, onboarding and enquiry Vue forms; recommendation integration is not enabled by the Payload plugin. Existing fixture content in the Vue development helpers is illustrative.

```sh
npm test
npm run build:widget
```

Contract tests cover secret exclusion, configuration validation, production mock restrictions, authorization, origin checks, token responses, provisioning and Turnstile failures. Real-service deployment still requires validating your backend contract and permitted browser/Turnstile origins.

Public source availability does not establish an open-source license; the existing Vue package retains its license metadata pending the owner's licensing decision.

Initial floating nudges are derived from the first Input Suggestions group (up to three). Mobile nudges use the Vue widget’s existing ten-second cycle while chat is closed, resume after closing chat, and remain dismissed after the visitor closes them. Backend follow-up suggestions take precedence during an existing conversation.

### Legacy compatibility names

The public API is `leadsCloserChatbotPlugin`. The previous `dodobirdChatbotPlugin` export remains as a compatibility alias. The GitHub organization/package scope, WordPress import keys, authentication action, browser storage keys and existing DOM hooks retain their historical identifiers so existing installations, sessions and themes continue to work. They are technical compatibility identifiers, not customer-facing branding.

## Chatbot event reporting

The native reporting adapter preserves the WordPress chatbot's property View and image-click events (`item_view`, with `recommendation` or `chatbot_image_action` product types). It forwards validated events to `/api/reporting` using a server-held key and includes the existing session/visitor, campaign, property, message and conversation identifiers. No message text or enquiry fields are included. WooCommerce cart/purchase attribution and recommendation tracking remain outside this chatbot plugin.

Reporting is **denied by default**. Register `leadsCloserChatbotPlugin({ reporting: { hasConsent: req => /* validate your host's analytics consent */ false } })` and pass the current consent boolean to `<Chatbot analyticsConsent={allowed} />`. Custom mounts can import `startChatbotTracking` from the `/tracking` export, supply `hasConsent: () => boolean`, and invoke the returned cleanup when unmounting or withdrawing consent. No pre-consent events are queued. A server consent callback is mandatory even if browser consent is granted.

Server options `reporting.apiHostname`, `reporting.apiKey`, and `reporting.tenantId` override the saved chatbot origin/key and optionally supply `X-TENANT-ID`. Keep them server-only. The endpoint rejects missing/mismatched origins, invalid or oversized events, missing session cookies and requests without consent, and has a bounded per-process rate limit. Configure ingress rate limiting as appropriate for multi-instance hosting. Tracking failures never block chatting. Existing WordPress wire identifiers remain for backend compatibility; no schema migration is required.

## Publication checks

Run `npm run security:check` before publishing or pushing a release. It requires Gitleaks on PATH (or set `GITLEAKS_BIN` to its executable), scans all reachable Git history and the current publishable source with redacted output, rejects private-file paths/symlinks, and checks the npm package manifest. `prepublishOnly` runs this check and the contract tests. A missing scanner fails the check instead of skipping it.

Keep real credentials in the host's private runtime configuration, never in Vue environment variables or fixtures. Use reserved `example.com` addresses for examples. Do not add customer screenshots, enquiry exports, database dumps, or production configuration to the generic plugin. A clean scan is evidence for the checked revision, not a guarantee that arbitrary future changes or external copies are confidential.

Behind a reverse proxy, set Payload's `serverURL` to the canonical public website origin. Reporting and admin provisioning/import origin checks use that trusted configuration instead of the container's internal URL. Forwarded headers do not grant access to other origins. MSIR uses its existing `NEXT_PUBLIC_API_BASE_URL` site origin for this setting.
