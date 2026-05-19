const STEPS = [
  { n: 1, label: "Personal" },
  { n: 2, label: "Addresses" },
  { n: 3, label: "Account" },
  { n: 4, label: "Document" },
];

interface StepIndicatorProps {
  current: number;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex items-start justify-center mb-8">
      {STEPS.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                current > step.n
                  ? "bg-rose-500 text-white"
                  : current === step.n
                  ? "bg-rose-500 text-white ring-4 ring-rose-100"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {current > step.n ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.n
              )}
            </div>
            <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${current >= step.n ? "text-rose-500" : "text-slate-400"}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 sm:w-16 h-0.5 mx-1 mb-5 transition-colors duration-300 ${current > step.n ? "bg-rose-400" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
