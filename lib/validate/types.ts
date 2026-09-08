export interface ValidationError {
  error: string;
}

export function isValidationError(value: unknown): value is ValidationError {
  return typeof value === "object" && value !== null && "error" in value;
}
