// The one header shape every top-level page uses: a title, a one-line
// subtitle, and optionally page-specific content (e.g. a stat row) slotted
// directly below. `pl-6` matches Card's own left padding (p-6) so the
// title's first character lines up with card content's first character
// below it.
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="pl-6">
      <h1 className="text-[22px] font-semibold text-ink">{title}</h1>
      <p className="mt-1 text-[15px] text-muted">{subtitle}</p>
      {children}
    </div>
  );
}
