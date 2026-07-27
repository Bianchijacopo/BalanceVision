const isDev = process.env.NODE_ENV === 'development';

export function wrapAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return;

  const status = err.status || err.statusCode || 500;
  const message = isDev ? err.message : 'Errore interno del server';

  const body = { error: message };
  if (isDev && err.stack) {
    body.stack = err.stack.split('\n').map(l => l.trim()).slice(0, 5);
  }

  console.error('[error]', err.status || 500, err.message);
  if (isDev && err.stack) {
    console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  }

  res.status(status).json(body);
}

export function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
  } else {
    next();
  }
}
