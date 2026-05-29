import { Form } from "react-router";
import { Button } from "~/components/ui/Button";

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  hiddenInputs: Record<string, string>;
  onCancel: () => void;
}

// Shared confirmation modal — renders a Form so the action runs server-side.
export function ConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  danger,
  hiddenInputs,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{description}</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>{cancelLabel}</Button>
          <Form method="post" className="flex-1" onSubmit={onCancel}>
            {Object.entries(hiddenInputs).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <Button type="submit" variant={danger ? "danger" : "primary"} className="w-full">{confirmLabel}</Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
