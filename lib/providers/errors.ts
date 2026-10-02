export enum ProviderErrorCode {
  INSUFFICIENT_PROVIDER_BALANCE = "INSUFFICIENT_PROVIDER_BALANCE",
  INVALID_SERVICE = "INVALID_SERVICE",
  INVALID_TARGET = "INVALID_TARGET",
  INVALID_QUANTITY = "INVALID_QUANTITY",
  PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT",
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  ORDER_REJECTED = "ORDER_REJECTED",
  UNKNOWN_PROVIDER_ERROR = "UNKNOWN_PROVIDER_ERROR",
}

export class ProviderError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "ProviderError";
  }
}

export function userMessageForProviderError(code: ProviderErrorCode): string {
  switch (code) {
    case ProviderErrorCode.INSUFFICIENT_PROVIDER_BALANCE:
      return "Service temporarily unavailable. Please try again later or contact support.";
    case ProviderErrorCode.INVALID_SERVICE:
      return "This service is no longer available.";
    case ProviderErrorCode.INVALID_TARGET:
      return "The target URL or username is invalid.";
    case ProviderErrorCode.INVALID_QUANTITY:
      return "Quantity is outside the allowed range.";
    case ProviderErrorCode.PROVIDER_TIMEOUT:
      return "The service provider timed out. Your order may still be processing.";
    case ProviderErrorCode.PROVIDER_UNAVAILABLE:
      return "Service provider is unavailable. Please try again later.";
    case ProviderErrorCode.ORDER_REJECTED:
      return "Your order was rejected. Please check the target and try again.";
    default:
      return "Something went wrong while processing your order. Please contact support.";
  }
}
