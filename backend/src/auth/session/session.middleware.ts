import session, { type SessionOptions, type Store } from 'express-session';

type SessionMiddlewareConfiguration = {
  store: Store;
  secret: string;
  isProduction: boolean;
  maxAgeMs: number;
};

function createSessionOptions({
  store,
  secret,
  isProduction,
  maxAgeMs,
}: SessionMiddlewareConfiguration): SessionOptions {
  return {
    store,
    secret,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeMs,
    },
  };
}

function createSessionMiddleware(
  configuration: SessionMiddlewareConfiguration,
) {
  return session(createSessionOptions(configuration));
}

export {
  createSessionMiddleware,
  createSessionOptions,
  type SessionMiddlewareConfiguration,
};
