interface Credential {
  label: string;
  values: Record<string, string>;
}

interface DevFillProps {
  credentials: Credential[];
}

export function DevFill({ credentials }: DevFillProps) {
  if (!import.meta.env.DEV) return null;

  function fill(values: Record<string, string>) {
    for (const [name, value] of Object.entries(values)) {
      const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (input) {
        input.value = value;
        // Trigger change event so React picks up the value if needed
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">
      <p className="mb-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">
        🔧 Dev credentials
      </p>
      <div className="flex flex-wrap gap-2">
        {credentials.map(({ label, values }) => (
          <button
            key={label}
            type="button"
            onClick={() => fill(values)}
            className="rounded-lg bg-white border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
