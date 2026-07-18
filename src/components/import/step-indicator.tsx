import { CheckIcon } from "@/components/icons/dashboard-icons";

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
    <div className="hidden w-48 shrink-0 flex-col sm:flex">
      {STEPS.map((s, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors ${
                  isComplete
                    ? "gradient-accent text-white"
                    : isActive
                      ? "bg-ink-solid text-white"
                      : "border border-border bg-surface text-muted"
                }`}
              >
                {isComplete ? <CheckIcon className="h-4 w-4" /> : i + 1}
              </div>
              {!isLast && (
                <div
                  className={`w-px flex-1 ${isComplete ? "bg-violet-400" : "bg-border"}`}
                  style={{ minHeight: 28 }}
                />
              )}
            </div>
            <div className={isLast ? "pb-0" : "pb-7"}>
              <p
                className={`pt-1 text-[13px] font-medium ${
                  isActive || isComplete ? "text-foreground" : "text-muted"
                }`}
              >
                {s.label}
              </p>
              {isActive && (
                <p className="mt-0.5 text-[11px] text-muted-2">
                  Step {i + 1} of {STEPS.length}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
