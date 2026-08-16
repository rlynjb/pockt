import { useEffect, useRef, useState } from "react";
import { SLOTS, type Slot } from "@/src/domain/habits";
import { focusFirstDialogControl, trapDialogTab } from "@/src/ui/dialog-focus";
import type { EditableHabit, HabitFormValues } from "@/src/ui/types";

type Props = {
  mode: "add" | "edit";
  open: boolean;
  habit?: EditableHabit;
  saving: boolean;
  error: string | null;
  onClose(): void;
  onSubmit(values: HabitFormValues): void;
  onArchive?(): void;
};

export function HabitFormDialog({ mode, open, habit, saving, error, onClose, onSubmit, onArchive }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [name, setName] = useState(habit?.name ?? "");
  const [slot, setSlot] = useState<Slot>(habit?.slot ?? "Morning");

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => focusFirstDialogControl(panelRef.current), 0);

    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialogBackdrop" role="presentation">
      <div
        className="dialogPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-form-title"
        ref={panelRef}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
          trapDialogTab(event, panelRef);
        }}
      >
        <header className="dialogHeader">
          <h2 id="habit-form-title">{mode === "add" ? "Add habit" : "Edit habit"}</h2>
          <button type="button" className="textButton" onClick={onClose}>
            Close
          </button>
        </header>
        <form
          className="habitForm"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ name, slot });
          }}
        >
          <label>
            <span>Habit name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-describedby={error ? "habit-form-error" : undefined}
            />
          </label>
          <label>
            <span>Slot</span>
            <select value={slot} onChange={(event) => setSlot(event.target.value as Slot)}>
              {SLOTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p id="habit-form-error" role="alert" className="bannerError">
              {error}
            </p>
          ) : null}
          <footer className="dialogActions">
            {mode === "edit" && onArchive ? (
              <button type="button" className="dangerButton" onClick={onArchive} disabled={saving}>
                Archive habit
              </button>
            ) : null}
            <button type="button" className="secondaryButton" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primaryButton" disabled={saving}>
              {mode === "add" ? "Add habit" : "Save changes"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
