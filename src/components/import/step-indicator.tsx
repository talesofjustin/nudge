import { CheckIcon } from "@/components/icons/dashboard-icons";

export type Step = "account" | "upload" | "review" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "upload", label: "Upload" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export function StepIndicator({ step }: { step: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={s.key} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <div className="flex shrink-0 items-center gap-2">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                  isComplete
                    ? "gradient-accent text-white"
                    : isActive
                      ? "bg-ink-solid text-white"
                      : "border border-border bg-surface text-muted"
                }`}
              >
                {isComplete ? <CheckIcon className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[12.5px] font-medium ${
                  isActive || isComplete ? "text-foreground" : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
            {!isLast && (
              <div className={`mx-3 h-px flex-1 ${isComplete ? "bg-violet-400" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
