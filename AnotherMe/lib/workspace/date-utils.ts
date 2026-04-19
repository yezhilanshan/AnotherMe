export function toLocalDateKey(input: Date | number) {
  const date = typeof input === 'number' ? new Date(input) : new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftLocalDateKey(baseDate: Date, offsetDays: number) {
  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() + offsetDays);
  return toLocalDateKey(date);
}
