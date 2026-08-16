import { useEffect, useRef } from "react";
import { focusFirstDialogControl, trapDialogTab } from "@/src/ui/dialog-focus";

type Props = {
  open: boolean;
  habitName: string;
  saving: boolean;
  error: string | null;
  onCancel(): void;
  onConfirm(): void;
};

export function ArchiveDialog({ open, habitName, saving, error, onCancel, onConfirm }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

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
        aria-labelledby="archive-title"
        ref={panelRef}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
          trapDialogTab(event, panelRef);
        }}
      >
        <h2 id="archive-title">Archive habit</h2>
        <p>{habitName} will disappear from active tracking, but historical check-ins remain.</p>
        {error ? (
          <p role="alert" className="bannerError">
            {error}
          </p>
        ) : null}
        <footer className="dialogActions">
          <button type="button" className="secondaryButton" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="dangerButton" onClick={onConfirm} disabled={saving}>
            Confirm archive
          </button>
        </footer>
      </div>
    </div>
  );
}
