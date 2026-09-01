export const UNAUTHENTICATED_ERROR = {
  code: 'AUTH_UNAUTHENTICATED',
  message: 'Authentication required',
} as const;

export const PASSWORD_CHANGE_REQUIRED_ERROR = {
  code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
  message: 'Password change is required before accessing the application',
} as const;
