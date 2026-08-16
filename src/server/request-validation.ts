import { ServiceError } from "@/src/server/errors";

export function parseRequiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ServiceError("bad_request", `${field} must be a boolean`, 400);
  }
  return value;
}
