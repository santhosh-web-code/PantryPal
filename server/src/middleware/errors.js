export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return;
  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status >= 500 ? 'Internal server error' : error.message;
  res.status(status).json({ error: { code: error.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'), message } });
}
