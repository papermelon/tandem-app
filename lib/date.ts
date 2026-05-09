const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function offsetDate(days: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setTime(date.getTime() + days * MS_PER_DAY);
  return date.toISOString();
}

export function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatRelative(value: string) {
  const now = new Date();
  const target = new Date(value);
  const diffDays = Math.round((target.getTime() - now.getTime()) / MS_PER_DAY);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
  return formatDay(value);
}
