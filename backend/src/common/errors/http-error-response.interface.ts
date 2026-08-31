export interface HttpErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}
