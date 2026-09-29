export function formatPercent(val: number): string {
  return `${Math.round(val * 100)}%`;
}

export function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  try {
    const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  } catch {
    return dateStr;
  }
}

export function getSeverityClass(sev: string): string {
  switch (sev.toUpperCase()) {
    case 'CRITICAL':
      return 'badge-critical';
    case 'HIGH':
      return 'badge-high';
    case 'MEDIUM':
      return 'badge-medium';
    default:
      return 'badge-resolved';
  }
}
