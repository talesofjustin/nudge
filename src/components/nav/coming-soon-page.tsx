export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="text-[22px] font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-[15px] text-muted">Coming soon.</p>
    </div>
  );
}
