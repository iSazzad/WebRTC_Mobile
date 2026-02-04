export const createPrivateChatId = (userId1: string, userId2: string) => {
  return [userId1.toString(), userId2.toString()].sort().join("_");
};

export const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const getDateHeader = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
