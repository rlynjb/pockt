import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ArchiveDialog } from "@/src/ui/ArchiveDialog";
import { HabitFormDialog } from "@/src/ui/HabitFormDialog";

describe("HabitFormDialog", () => {
  it("uses the same compact fields for adding", async () => {
    const onSubmit = vi.fn();
    render(
      <HabitFormDialog
        mode="add"
        open
        saving={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Habit name"), "Drink water");
    await user.selectOptions(screen.getByLabelText("Slot"), "Midday");
    await user.click(screen.getByRole("button", { name: "Add habit" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "Drink water", slot: "Midday" });
  });

  it("uses the same compact fields for editing and shows archive separately", () => {
    render(
      <HabitFormDialog
        mode="edit"
        open
        saving={false}
        error={null}
        habit={{ id: "h1", name: "Read", slot: "Evening", status: "Active", completions: {} }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onArchive={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Habit name")).toHaveValue("Read");
    expect(screen.getByLabelText("Slot")).toHaveValue("Evening");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive habit" })).toBeInTheDocument();
  });
});

describe("ArchiveDialog", () => {
  it("states that active tracking hides the habit and history remains", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ArchiveDialog
        open
        habitName="Read"
        saving={false}
        error={null}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
    const user = userEvent.setup();

    expect(screen.getByText("Read will disappear from active tracking, but historical check-ins remain.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm archive" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
