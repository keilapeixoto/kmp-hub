export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function thresholdColor(pct: number): string {
  if (pct >= 100) return "bg-red-600";
  if (pct >= 90) return "bg-red-500";
  if (pct >= 80) return "bg-orange-500";
  if (pct >= 70) return "bg-amber-500";
  if (pct >= 50) return "bg-yellow-400";
  return "bg-kmp-orange";
}
