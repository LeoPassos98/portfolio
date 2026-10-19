const osUrl = (
  import.meta.env.VITE_OS_URL?.trim() || 'https://os.leonardopassos.com'
).replace(/\/+$/, '')

export const osLoginUrl = `${osUrl}/login`
