export type ServiceErrorCode = "bad_request" | "not_found" | "configuration" | "upstream";

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown): { status: number; body: { error: string } } {
  if (error instanceof ServiceError) {
    return { status: error.status, body: { error: error.message } };
  }

  if (error instanceof Error && ["Habit name is required", "Slot must be one of Morning, Midday, Evening, Anytime", "Expected YYYY-MM-DD date"].includes(error.message)) {
    return { status: 400, body: { error: error.message } };
  }

  return { status: 500, body: { error: "The habit tracker is unavailable right now." } };
}
