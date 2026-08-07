type ErrorLike = {
  message?: unknown;
  response?: unknown;
  status?: unknown;
};

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? error as ErrorLike : {};
}

export function getErrorMessage(error: unknown, fallback: string) {
  const message = asErrorLike(error).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function getErrorStatus(error: unknown) {
  const status = asErrorLike(error).status;
  return typeof status === "number" ? status : undefined;
}

export function getErrorResponse(error: unknown) {
  return asErrorLike(error).response;
}
