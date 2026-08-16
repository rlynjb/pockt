import { ServiceError } from "@/src/server/errors";

type JsonRecord = Record<string, unknown>;

export function parseRequiredObject(value: unknown, field: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ServiceError("bad_request", `${field} must be an object`, 400);
  }
  return value as JsonRecord;
}

export function parseRequiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ServiceError("bad_request", `${field} must be a boolean`, 400);
  }
  return value;
}
