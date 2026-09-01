export function createCorsOptions(frontendOrigin: string) {
  return {
    origin: frontendOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
  };
}
