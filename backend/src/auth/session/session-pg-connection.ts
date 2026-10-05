/** Preserve pg's current certificate and hostname verification for SSL aliases. */
export function normalizeSessionPgConnectionString(
  connectionString: string,
): string {
  const url = new URL(connectionString);
  const mode = url.searchParams.getAll('sslmode').at(-1);
  const libpqCompatibility = url.searchParams.getAll('uselibpqcompat').at(-1);

  // Explicit libpq semantics differ; never reinterpret them or Prisma's URL.
  if (
    libpqCompatibility === 'true' ||
    !mode ||
    !['prefer', 'require', 'verify-ca'].includes(mode)
  ) {
    return connectionString;
  }

  url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}
