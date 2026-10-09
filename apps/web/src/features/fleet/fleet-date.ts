const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export function formattedDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}
