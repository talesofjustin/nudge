export type Step = "upload" | "account" | "mapping" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "account", label: "Account & space" },
  { key: "mapping", label: "Map columns" },
  { key: "done", label: "Done" },
];

export function StepIndicator({ step }: { step: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={`inline-flex h-7 items-center justify-center rounded-full px-3 text-[12px] font-medium transition-colors ${
                isActive
                  ? "bg-ink-solid text-white"
                  : isComplete
                    ? "chip-violet"
                    : "border border-border bg-surface text-muted"
              }`}
            >
              {i + 1}. {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
