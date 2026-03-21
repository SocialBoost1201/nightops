export const AppErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  VALIDATION_INVALID_DATE: 'VALIDATION_INVALID_DATE',
  VALIDATION_INVALID_RANGE: 'VALIDATION_INVALID_RANGE',
  REPORT_INVALID_BUSINESS_DATE: 'REPORT_INVALID_BUSINESS_DATE',
  REPORT_INVALID_RANGE: 'REPORT_INVALID_RANGE',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type AppErrorCode = (typeof AppErrorCodes)[keyof typeof AppErrorCodes];

const legacyCodeMap: Record<string, AppErrorCode> = {
  AUTH_001: AppErrorCodes.AUTH_INVALID_CREDENTIALS,
  AUTH_002: AppErrorCodes.ACCESS_DENIED,
  AUTH_003: AppErrorCodes.AUTH_TOKEN_EXPIRED,
  ACCESS_001: AppErrorCodes.ACCESS_DENIED,
  ACCESS_002: AppErrorCodes.ACCESS_DENIED,
  TENANT_001: AppErrorCodes.TENANT_MISMATCH,
  TENANT_002: AppErrorCodes.NOT_FOUND,
  VALID_001: AppErrorCodes.NOT_FOUND,
  VALID_002: AppErrorCodes.CONFLICT,
  VALID_003: AppErrorCodes.VALIDATION_INVALID_RANGE,
  BILLING_001: AppErrorCodes.ACCESS_DENIED,
  SYS_001: AppErrorCodes.INTERNAL_SERVER_ERROR,
};

export const statusDefaultCodeMap: Record<number, AppErrorCode> = {
  400: AppErrorCodes.VALIDATION_INVALID_RANGE,
  401: AppErrorCodes.AUTH_TOKEN_EXPIRED,
  403: AppErrorCodes.ACCESS_DENIED,
  404: AppErrorCodes.NOT_FOUND,
  409: AppErrorCodes.CONFLICT,
  422: AppErrorCodes.VALIDATION_INVALID_RANGE,
  500: AppErrorCodes.INTERNAL_SERVER_ERROR,
};

export const normalizeErrorCode = (errorCode: string | undefined, statusCode: number): AppErrorCode => {
  if (!errorCode) {
    return statusDefaultCodeMap[statusCode] ?? AppErrorCodes.INTERNAL_SERVER_ERROR;
  }

  if (Object.values(AppErrorCodes).includes(errorCode as AppErrorCode)) {
    return errorCode as AppErrorCode;
  }

  return legacyCodeMap[errorCode] ?? statusDefaultCodeMap[statusCode] ?? AppErrorCodes.INTERNAL_SERVER_ERROR;
};
