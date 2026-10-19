export const siteHomeUrl = (
  import.meta.env.VITE_SITE_URL?.trim() || 'https://leonardopassos.com'
).replace(/\/+$/, '')
