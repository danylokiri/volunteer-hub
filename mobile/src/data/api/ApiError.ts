// Single error class thrown by ApiService on non-2xx or network
// failures. Repositories catch it and decide whether to surface a
// message to the UI; UI converts to a Ukrainian toast string.

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status?: number,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'ApiError';
  }
}
