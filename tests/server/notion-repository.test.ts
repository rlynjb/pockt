import { describe, expect, it, vi } from "vitest";
import { createNotionHabitRepositoryForClient } from "@/src/server/notion/repository";

function fakeClient() {
  return {
    dataSources: { query: vi.fn() },
    pages: { create: vi.fn(), update: vi.fn(), retrieve: vi.fn() }
  };
}

describe("Notion habit repository", () => {
  it("maps active Notion habit pages to domain habits", async () => {
    const client = fakeClient();
    client.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: "habit-1",
          properties: {
            Name: { type: "title", title: [{ plain_text: "Drink water" }] },
            Slot: { type: "select", select: { name: "Morning" } },
            Status: { type: "select", select: { name: "Active" } }
          }
        }
      ]
    });

    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.listActiveHabits()).resolves.toEqual([
      { id: "habit-1", name: "Drink water", slot: "Morning", status: "Active" }
    ]);
    expect(client.dataSources.query).toHaveBeenCalledWith(
      expect.objectContaining({
        data_source_id: "habits-db",
        filter: { property: "Status", select: { equals: "Active" } }
      })
    );
  });

  it("creates active habits with the approved properties", async () => {
    const client = fakeClient();
    client.pages.create.mockResolvedValueOnce({
      id: "habit-2",
      properties: {
        Name: { type: "title", title: [{ plain_text: "Read" }] },
        Slot: { type: "select", select: { name: "Evening" } },
        Status: { type: "select", select: { name: "Active" } }
      }
    });
    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.createHabit({ name: "Read", slot: "Evening" })).resolves.toEqual({
      id: "habit-2",
      name: "Read",
      slot: "Evening",
      status: "Active"
    });
    expect(client.pages.create).toHaveBeenCalledWith({
      parent: { data_source_id: "habits-db" },
      properties: {
        Name: { title: [{ text: { content: "Read" } }] },
        Slot: { select: { name: "Evening" } },
        Status: { select: { name: "Active" } }
      }
    });
  });

  it("collects paginated active habit results", async () => {
    const client = fakeClient();
    client.dataSources.query
      .mockResolvedValueOnce({
        results: [
          {
            id: "habit-1",
            properties: {
              Name: { type: "title", title: [{ plain_text: "Drink water" }] },
              Slot: { type: "select", select: { name: "Morning" } },
              Status: { type: "select", select: { name: "Active" } }
            }
          }
        ],
        has_more: true,
        next_cursor: "cursor-2"
      })
      .mockResolvedValueOnce({
        results: [
          {
            id: "habit-2",
            properties: {
              Name: { type: "title", title: [{ plain_text: "Read" }] },
              Slot: { type: "select", select: { name: "Evening" } },
              Status: { type: "select", select: { name: "Active" } }
            }
          }
        ],
        has_more: false,
        next_cursor: null
      });

    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.listActiveHabits()).resolves.toEqual([
      { id: "habit-1", name: "Drink water", slot: "Morning", status: "Active" },
      { id: "habit-2", name: "Read", slot: "Evening", status: "Active" }
    ]);
    expect(client.dataSources.query).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data_source_id: "habits-db", start_cursor: "cursor-2" })
    );
  });

  it("collects paginated completion results", async () => {
    const client = fakeClient();
    client.dataSources.query
      .mockResolvedValueOnce({
        results: [
          {
            id: "completion-1",
            properties: {
              Habit: { type: "relation", relation: [{ id: "habit-1" }] },
              "Completed Date": { type: "date", date: { start: "2026-08-10" } }
            }
          }
        ],
        has_more: true,
        next_cursor: "cursor-2"
      })
      .mockResolvedValueOnce({
        results: [
          {
            id: "completion-2",
            properties: {
              Habit: { type: "relation", relation: [{ id: "habit-2" }] },
              "Completed Date": { type: "date", date: { start: "2026-08-16" } }
            }
          }
        ],
        has_more: false,
        next_cursor: null
      });

    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.listCompletions("2026-08-10", "2026-08-16")).resolves.toEqual([
      { id: "completion-1", habitId: "habit-1", completedDate: "2026-08-10" },
      { id: "completion-2", habitId: "habit-2", completedDate: "2026-08-16" }
    ]);
    expect(client.dataSources.query).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data_source_id: "completions-db", start_cursor: "cursor-2" })
    );
  });

  it("sets archive by updating Status to Archived", async () => {
    const client = fakeClient();
    client.pages.update.mockResolvedValueOnce({
      id: "habit-3",
      properties: {
        Name: { type: "title", title: [{ plain_text: "Stretch" }] },
        Slot: { type: "select", select: { name: "Morning" } },
        Status: { type: "select", select: { name: "Archived" } }
      }
    });
    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.archiveHabit("habit-3")).resolves.toEqual({
      id: "habit-3",
      name: "Stretch",
      slot: "Morning",
      status: "Archived"
    });
    expect(client.pages.update).toHaveBeenCalledWith({
      page_id: "habit-3",
      properties: { Status: { select: { name: "Archived" } } }
    });
  });

  it("creates one completion only when none exists", async () => {
    const client = fakeClient();
    client.dataSources.query.mockResolvedValueOnce({ results: [] });
    client.pages.create.mockResolvedValueOnce({
      id: "completion-1",
      properties: {
        Habit: { type: "relation", relation: [{ id: "habit-1" }] },
        "Completed Date": { type: "date", date: { start: "2026-08-16" } }
      }
    });
    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.ensureCompletion({ habitId: "habit-1", date: "2026-08-16", completed: true })).resolves.toEqual({
      id: "completion-1",
      habitId: "habit-1",
      completedDate: "2026-08-16"
    });
    expect(client.pages.create).toHaveBeenCalledWith({
      parent: { data_source_id: "completions-db" },
      properties: {
        Habit: { relation: [{ id: "habit-1" }] },
        "Completed Date": { date: { start: "2026-08-16" } }
      }
    });
  });

  it("archives an existing completion when setting completed false", async () => {
    const client = fakeClient();
    client.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: "completion-2",
          properties: {
            Habit: { type: "relation", relation: [{ id: "habit-1" }] },
            "Completed Date": { type: "date", date: { start: "2026-08-16" } }
          }
        }
      ]
    });
    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.ensureCompletion({ habitId: "habit-1", date: "2026-08-16", completed: false })).resolves.toBeNull();
    expect(client.pages.update).toHaveBeenCalledWith({ page_id: "completion-2", archived: true });
  });

  it("archives every duplicate completion when setting completed false", async () => {
    const client = fakeClient();
    client.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: "completion-2",
          properties: {
            Habit: { type: "relation", relation: [{ id: "habit-1" }] },
            "Completed Date": { type: "date", date: { start: "2026-08-16" } }
          }
        },
        {
          id: "completion-duplicate",
          properties: {
            Habit: { type: "relation", relation: [{ id: "habit-1" }] },
            "Completed Date": { type: "date", date: { start: "2026-08-16" } }
          }
        }
      ]
    });
    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.ensureCompletion({ habitId: "habit-1", date: "2026-08-16", completed: false })).resolves.toBeNull();
    expect(client.pages.update).toHaveBeenCalledWith({ page_id: "completion-2", archived: true });
    expect(client.pages.update).toHaveBeenCalledWith({ page_id: "completion-duplicate", archived: true });
  });

  it("returns the existing completion and archives duplicates when setting completed true", async () => {
    const client = fakeClient();
    client.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: "completion-2",
          properties: {
            Habit: { type: "relation", relation: [{ id: "habit-1" }] },
            "Completed Date": { type: "date", date: { start: "2026-08-16" } }
          }
        },
        {
          id: "completion-duplicate",
          properties: {
            Habit: { type: "relation", relation: [{ id: "habit-1" }] },
            "Completed Date": { type: "date", date: { start: "2026-08-16" } }
          }
        }
      ]
    });
    const repo = createNotionHabitRepositoryForClient(client, {
      habitsDataSourceId: "habits-db",
      completionsDataSourceId: "completions-db"
    });

    await expect(repo.ensureCompletion({ habitId: "habit-1", date: "2026-08-16", completed: true })).resolves.toEqual({
      id: "completion-2",
      habitId: "habit-1",
      completedDate: "2026-08-16"
    });
    expect(client.pages.create).not.toHaveBeenCalled();
    expect(client.pages.update).toHaveBeenCalledWith({ page_id: "completion-duplicate", archived: true });
  });
});
