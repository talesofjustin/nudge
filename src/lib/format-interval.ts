// Human label for a detected/estimated recurring cadence. Bands are wide
// enough to absorb the ±5 day drift detection already tolerates.
export function formatInterval(days: number): string {
  if (days <= 10) return "Weekly";
  if (days <= 20) return "Biweekly";
  if (days <= 45) return "Monthly";
  if (days <= 100) return "Quarterly";
  if (days <= 200) return "Every 6 months";
  if (days <= 400) return "Yearly";
  return `Every ${days} days`;
}
