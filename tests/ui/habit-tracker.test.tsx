import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HabitTracker } from "@/src/ui/HabitTracker";
import type { HabitTrackerApi } from "@/src/ui/api";

function api(overrides: Partial<HabitTrackerApi> = {}): HabitTrackerApi {
  return {
    loadWeek: vi.fn().mockResolvedValue({
      weekStart: "2026-08-10",
      days: [
        { date: "2026-08-10", weekday: "Mon", dayOfMonth: 10, isToday: false },
        { date: "2026-08-11", weekday: "Tue", dayOfMonth: 11, isToday: false },
        { date: "2026-08-12", weekday: "Wed", dayOfMonth: 12, isToday: false },
        { date: "2026-08-13", weekday: "Thu", dayOfMonth: 13, isToday: false },
        { date: "2026-08-14", weekday: "Fri", dayOfMonth: 14, isToday: false },
        { date: "2026-08-15", weekday: "Sat", dayOfMonth: 15, isToday: false },
        { date: "2026-08-16", weekday: "Sun", dayOfMonth: 16, isToday: true }
      ],
      groups: [
        {
          slot: "Morning",
          habits: [
            {
              id: "h1",
              name: "Drink water",
              slot: "Morning",
              status: "Active",
              completions: { "2026-08-10": true }
            }
          ]
        }
      ]
    }),
    setCompletion: vi.fn().mockResolvedValue(undefined),
    createHabit: vi.fn(),
    updateHabit: vi.fn(),
    archiveHabit: vi.fn(),
    ...overrides
  };
}

describe("HabitTracker", () => {
  it("renders a Monday-Sunday matrix with the current day distinguished", async () => {
    render(<HabitTracker api={api()} initialToday={new Date(2026, 7, 16, 9)} />);

    expect(await screen.findByRole("heading", { name: "pockt habits" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Mon 10/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Sun 16 Today/ })).toBeInTheDocument();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Drink water" })).toBeInTheDocument();
  });

  it("shows completed and incomplete cells as accessible buttons", async () => {
    render(<HabitTracker api={api()} initialToday={new Date(2026, 7, 16, 9)} />);

    const completed = await screen.findByRole("button", { name: "Drink water on Monday, August 10: completed" });
    const incomplete = screen.getByRole("button", { name: "Drink water on Tuesday, August 11: incomplete" });

    expect(completed).toHaveTextContent("✓");
    expect(incomplete).toHaveAttribute("aria-pressed", "false");
  });

  it("optimistically toggles a cell and persists desired final state", async () => {
    const fakeApi = api();
    render(<HabitTracker api={fakeApi} initialToday={new Date(2026, 7, 16, 9)} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Drink water on Tuesday, August 11: incomplete" }));

    expect(fakeApi.setCompletion).toHaveBeenCalledWith("h1", "2026-08-11", true);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Drink water on Tuesday, August 11: completed" })).toBeInTheDocument();
    });
  });

  it("rolls back a failed toggle and shows retry feedback", async () => {
    const fakeApi = api({
      setCompletion: vi.fn().mockRejectedValueOnce(new Error("Notion failed"))
    });
    render(<HabitTracker api={fakeApi} initialToday={new Date(2026, 7, 16, 9)} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Drink water on Tuesday, August 11: incomplete" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Drink water on Tuesday, August 11: incomplete" })).toBeInTheDocument();
    });
    expect(screen.getByText("Could not save Tuesday, August 11 for Drink water.")).toBeInTheDocument();
  });

  it("shows an empty tracker with Add habit when there are no active habits", async () => {
    const fakeApi = api({
      loadWeek: vi.fn().mockResolvedValue({
        weekStart: "2026-08-10",
        days: [],
        groups: []
      })
    });
    render(<HabitTracker api={fakeApi} initialToday={new Date(2026, 7, 16, 9)} />);

    expect(await screen.findByText("No active habits yet.")).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("button", { name: "Add habit" })).toBeInTheDocument();
  });

  it("creates, edits, and archives habits through the approved flows", async () => {
    const initialWeek = {
      weekStart: "2026-08-10",
      days: [
        { date: "2026-08-10", weekday: "Mon", dayOfMonth: 10, isToday: false },
        { date: "2026-08-11", weekday: "Tue", dayOfMonth: 11, isToday: false },
        { date: "2026-08-12", weekday: "Wed", dayOfMonth: 12, isToday: false },
        { date: "2026-08-13", weekday: "Thu", dayOfMonth: 13, isToday: false },
        { date: "2026-08-14", weekday: "Fri", dayOfMonth: 14, isToday: false },
        { date: "2026-08-15", weekday: "Sat", dayOfMonth: 15, isToday: false },
        { date: "2026-08-16", weekday: "Sun", dayOfMonth: 16, isToday: true }
      ],
      groups: [
        {
          slot: "Morning",
          habits: [
            {
              id: "h1",
              name: "Drink water",
              slot: "Morning",
              status: "Active",
              completions: {}
            }
          ]
        }
      ]
    };
    const afterCreateWeek = {
      ...initialWeek,
      groups: [
        ...initialWeek.groups,
        {
          slot: "Midday",
          habits: [{ id: "h2", name: "Walk", slot: "Midday", status: "Active", completions: {} }]
        }
      ]
    };
    const afterUpdateWeek = {
      ...initialWeek,
      groups: [
        {
          slot: "Anytime",
          habits: [{ id: "h1", name: "Hydrate", slot: "Anytime", status: "Active", completions: {} }]
        }
      ]
    };
    const fakeApi = api({
      loadWeek: vi.fn()
        .mockResolvedValueOnce(initialWeek)
        .mockResolvedValueOnce(afterCreateWeek)
        .mockResolvedValueOnce(afterUpdateWeek)
        .mockResolvedValueOnce({ ...initialWeek, groups: [] }),
      createHabit: vi.fn().mockResolvedValue({ id: "h2", name: "Walk", slot: "Midday", status: "Active" }),
      updateHabit: vi.fn().mockResolvedValue({ id: "h1", name: "Hydrate", slot: "Anytime", status: "Active" }),
      archiveHabit: vi.fn().mockResolvedValue({ id: "h1", name: "Hydrate", slot: "Anytime", status: "Archived" })
    });
    render(<HabitTracker api={fakeApi} initialToday={new Date(2026, 7, 16, 9)} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add habit" }));
    await user.type(screen.getByLabelText("Habit name"), "Walk");
    await user.selectOptions(screen.getByLabelText("Slot"), "Midday");
    await user.click(screen.getByRole("button", { name: "Add habit" }));
    expect(fakeApi.createHabit).toHaveBeenCalledWith({ name: "Walk", slot: "Midday" });

    await user.click(await screen.findByRole("button", { name: "Drink water" }));
    await user.clear(screen.getByLabelText("Habit name"));
    await user.type(screen.getByLabelText("Habit name"), "Hydrate");
    await user.selectOptions(screen.getByLabelText("Slot"), "Anytime");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(fakeApi.updateHabit).toHaveBeenCalledWith("h1", { name: "Hydrate", slot: "Anytime" });

    await user.click(await screen.findByRole("button", { name: "Hydrate" }));
    await user.click(screen.getByRole("button", { name: "Archive habit" }));
    expect(screen.getByText("Hydrate will disappear from active tracking, but historical check-ins remain.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm archive" }));
    expect(fakeApi.archiveHabit).toHaveBeenCalledWith("h1");
  });
});
