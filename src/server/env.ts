import { z } from "zod";
import { ServiceError } from "@/src/server/errors";

const EnvSchema = z.object({
  NOTION_TOKEN: z.string().min(1),
  NOTION_HABITS_DATABASE_ID: z.string().min(1),
  NOTION_COMPLETIONS_DATABASE_ID: z.string().min(1)
});

export function getEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new ServiceError("configuration", "The habit tracker is not configured.", 503);
  }

  return {
    notionToken: result.data.NOTION_TOKEN,
    habitsDatabaseId: result.data.NOTION_HABITS_DATABASE_ID,
    completionsDatabaseId: result.data.NOTION_COMPLETIONS_DATABASE_ID
  };
}
