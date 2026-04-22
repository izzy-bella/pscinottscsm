export function errorHandler(error, req, res, next) {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction && status >= 500 ? 'Internal server error' : error.message || 'Internal server error';

  res.status(status).json({
    error: message
  });
}
