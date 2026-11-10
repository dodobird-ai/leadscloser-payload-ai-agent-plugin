/**
 * Jest stub for the `payload` package (mapped in jest.config.mjs). The real
 * package is ESM-only and drags in the whole runtime; unit-tested modules only
 * ever use APIError from it at runtime (types are erased by SWC).
 */
export class APIError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}
