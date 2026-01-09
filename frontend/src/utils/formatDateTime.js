export function formatDateTimePH() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // Changed to 24-hour format
  };
  return new Intl.DateTimeFormat("en-US", options).format(now);
}
