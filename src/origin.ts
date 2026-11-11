import type { PayloadRequest } from 'payload'

/** Use a configured public origin behind a reverse proxy. Never trust client
 * supplied Host/X-Forwarded-* headers to grant cross-origin reporting access. */
export const publicOrigin = (req: PayloadRequest) =>
  new URL(req.payload.config?.serverURL || req.url!).origin
