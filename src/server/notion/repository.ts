import { Client } from "@notionhq/client";
import { normalizeHabitName, parseSlot, type Completion, type Habit, type HabitStatus } from "@/src/domain/habits";
import { assertDateOnly } from "@/src/domain/week";
import { getEnv } from "@/src/server/env";
import type {
  CreateHabitInput,
  HabitRepository,
  ReorderHabitInput,
  SetCompletionInput,
  UpdateHabitInput
} from "@/src/server/repository";
import type { NotionClientLike, NotionRepositoryConfig } from "@/src/server/notion/types";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function getProperties(page: unknown): RecordValue {
  if (!isRecord(page) || !isRecord(page.properties)) {
    throw new Error("Unexpected Notion page shape");
  }
  return page.properties;
}

function getPageId(page: unknown): string {
  if (!isRecord(page) || typeof page.id !== "string") {
    throw new Error("Unexpected Notion page id");
  }
  return page.id;
}

function titleText(page: unknown, property: string): string {
  const value = getProperties(page)[property];
  if (!isRecord(value) || !Array.isArray(value.title)) {
    return "";
  }
  const first = value.title[0];
  return isRecord(first) && typeof first.plain_text === "string" ? first.plain_text : "";
}

function selectName(page: unknown, property: string): string {
  const value = getProperties(page)[property];
  if (!isRecord(value) || !isRecord(value.select) || typeof value.select.name !== "string") {
    return "";
  }
  return value.select.name;
}

function relationFirstId(page: unknown, property: string): string | null {
  const value = getProperties(page)[property];
  if (!isRecord(value) || !Array.isArray(value.relation)) {
    return null;
  }
  const first = value.relation[0];
  return isRecord(first) && typeof first.id === "string" ? first.id : null;
}

function dateStart(page: unknown, property: string): string | null {
  const value = getProperties(page)[property];
  if (!isRecord(value) || !isRecord(value.date) || typeof value.date.start !== "string") {
    return null;
  }
  return value.date.start;
}

function numberValue(page: unknown, property: string): number | null {
  const value = getProperties(page)[property];
  if (!isRecord(value) || typeof value.number !== "number") {
    return null;
  }
  return value.number;
}

function mapHabit(page: unknown): Habit {
  const status = selectName(page, "Status");
  if (status !== "Active" && status !== "Archived") {
    throw new Error("Unexpected Notion habit status");
  }
  const sortOrder = numberValue(page, "Sort Order");

  return {
    id: getPageId(page),
    name: normalizeHabitName(titleText(page, "Name")),
    slot: parseSlot(selectName(page, "Slot")),
    status: status as HabitStatus,
    ...(sortOrder === null ? {} : { sortOrder })
  };
}

function mapCompletion(page: unknown): Completion {
  const habitId = relationFirstId(page, "Habit");
  const completedDate = dateStart(page, "Completed Date");
  if (!habitId || !completedDate) {
    throw new Error("Unexpected Notion completion shape");
  }
  return { id: getPageId(page), habitId, completedDate: assertDateOnly(completedDate) };
}

function endOfWeekFilter(startDate: string, endDate: string) {
  return {
    and: [
      { property: "Completed Date", date: { on_or_after: assertDateOnly(startDate) } },
      { property: "Completed Date", date: { on_or_before: assertDateOnly(endDate) } }
    ]
  };
}

async function queryAllDataSource(
  client: NotionClientLike,
  args: Record<string, unknown>
): Promise<unknown[]> {
  const results: unknown[] = [];
  let startCursor: string | null = null;

  do {
    const response = await client.dataSources.query({
      ...args,
      ...(startCursor ? { start_cursor: startCursor } : {})
    });
    results.push(...response.results);
    startCursor = response.has_more ? response.next_cursor ?? null : null;
  } while (startCursor);

  return results;
}

export function createNotionHabitRepositoryForClient(
  client: NotionClientLike,
  config: NotionRepositoryConfig
): HabitRepository {
  async function findCompletions(habitId: string, date: string): Promise<Completion[]> {
    const results = await queryAllDataSource(client, {
      data_source_id: config.completionsDataSourceId,
      filter: {
        and: [
          { property: "Habit", relation: { contains: habitId } },
          { property: "Completed Date", date: { equals: assertDateOnly(date) } }
        ]
      }
    });
    return results.map(mapCompletion);
  }

  async function archiveCompletion(completion: Completion): Promise<void> {
    await client.pages.update({ page_id: completion.id, archived: true });
  }

  return {
    async listActiveHabits() {
      const results = await queryAllDataSource(client, {
        data_source_id: config.habitsDataSourceId,
        filter: { property: "Status", select: { equals: "Active" } },
        sorts: [
          { property: "Sort Order", direction: "ascending" },
          { property: "Name", direction: "ascending" }
        ]
      });
      return results.map(mapHabit);
    },
    async listCompletions(startDate, endDate) {
      const results = await queryAllDataSource(client, {
        data_source_id: config.completionsDataSourceId,
        filter: endOfWeekFilter(startDate, endDate)
      });
      return results.map(mapCompletion);
    },
    async createHabit(input: CreateHabitInput) {
      const page = await client.pages.create({
        parent: { data_source_id: config.habitsDataSourceId },
        properties: {
          Name: { title: [{ text: { content: normalizeHabitName(input.name) } }] },
          Slot: { select: { name: parseSlot(input.slot) } },
          Status: { select: { name: "Active" } },
          "Sort Order": { number: input.sortOrder ?? Date.now() }
        }
      });
      return mapHabit(page);
    },
    async updateHabit(id: string, input: UpdateHabitInput) {
      const properties: Record<string, unknown> = {};
      if (input.name !== undefined) {
        properties.Name = { title: [{ text: { content: normalizeHabitName(input.name) } }] };
      }
      if (input.slot !== undefined) {
        properties.Slot = { select: { name: parseSlot(input.slot) } };
      }
      if (input.status !== undefined) {
        properties.Status = { select: { name: input.status } };
      }
      if (input.sortOrder !== undefined) {
        properties["Sort Order"] = { number: input.sortOrder };
      }
      const page = await client.pages.update({ page_id: id, properties });
      return mapHabit(page);
    },
    async archiveHabit(id: string) {
      const page = await client.pages.update({
        page_id: id,
        properties: { Status: { select: { name: "Archived" } } }
      });
      return mapHabit(page);
    },
    async getHabit(id: string) {
      if (!client.pages.retrieve) {
        return null;
      }
      try {
        return mapHabit(await client.pages.retrieve({ page_id: id }));
      } catch {
        return null;
      }
    },
    async ensureCompletion(input: SetCompletionInput) {
      const existing = await findCompletions(input.habitId, input.date);
      if (input.completed) {
        if (existing.length > 0) {
          await Promise.all(existing.slice(1).map(archiveCompletion));
          return existing[0];
        }
        const page = await client.pages.create({
          parent: { data_source_id: config.completionsDataSourceId },
          properties: {
            Habit: { relation: [{ id: input.habitId }] },
            "Completed Date": { date: { start: assertDateOnly(input.date) } }
          }
        });
        return mapCompletion(page);
      }
      await Promise.all(existing.map(archiveCompletion));
      return null;
    },
    async reorderHabits(input: ReorderHabitInput[]) {
      await Promise.all(
        input.map((habit) =>
          client.pages.update({
            page_id: habit.id,
            properties: { "Sort Order": { number: habit.sortOrder } }
          })
        )
      );
    }
  };
}

export function createNotionHabitRepository(): HabitRepository {
  const env = getEnv();
  const client = new Client({ auth: env.notionToken }) as unknown as NotionClientLike;
  return createNotionHabitRepositoryForClient(client, {
    habitsDataSourceId: env.habitsDataSourceId,
    completionsDataSourceId: env.completionsDataSourceId
  });
}
