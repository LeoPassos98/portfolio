const profileQueryKeys = {
  all: ['profile'] as const,
  detail: () => [...profileQueryKeys.all, 'detail'] as const,
}

export { profileQueryKeys }
