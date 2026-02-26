export const toYmd = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getTodayRange = () => {
  const today = toYmd(new Date());
  return { from: today, to: today };
};

export const getThisWeekRange = () => {
  const now = new Date();
  const day = now.getDay(); // 0 sunday
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toYmd(monday), to: toYmd(sunday) };
};

export const getThisMonthRange = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toYmd(first), to: toYmd(last) };
};

export const buildDateFilterQuery = (filter = {}) => {
  const params = new URLSearchParams();
  if (filter?.from) params.set("from", filter.from);
  if (filter?.to) params.set("to", filter.to);
  return params.toString();
};

export const hasDateFilter = (filter = {}) => Boolean(filter?.from || filter?.to);

