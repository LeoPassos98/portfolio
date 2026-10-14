export const UNAUTHENTICATED_ERROR = {
  code: 'AUTH_UNAUTHENTICATED',
  message: 'Authentication required',
} as const;

export const PASSWORD_CHANGE_REQUIRED_ERROR = {
  code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
  message: 'Password change is required before accessing the application',
} as const;

export const FORBIDDEN_ERROR = {
  code: 'AUTH_FORBIDDEN',
  message: 'You do not have permission to access this resource',
} as const;

export const CSRF_INVALID_TOKEN_ERROR = {
  code: 'CSRF_INVALID_TOKEN',
  message: 'CSRF token is invalid',
} as const;
