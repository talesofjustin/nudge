export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div
        className="shadow-soft relative w-full max-w-[380px] rounded-[20px] border border-border bg-surface p-8"
        style={{ animation: "fade-in-up 0.45s ease-out" }}
      >
        {children}
      </div>
    </div>
  );
}
