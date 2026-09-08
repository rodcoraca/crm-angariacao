const PORTUGAL_TIME_ZONE = "Europe/Lisbon";

const portugalTimeZoneFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PORTUGAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function getTimeZoneOffsetMs(date) {
  const parts = portugalTimeZoneFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

export function normalizePortugalLocalIsoToUtc(value) {
  if (!value) return null;

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?/
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "00", fraction = ""] = match;
  const milliseconds = Number(fraction.padEnd(3, "0")) || 0;
  const localWallTimeAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    milliseconds
  );

  let utcTime = localWallTimeAsUtc;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    utcTime = localWallTimeAsUtc - getTimeZoneOffsetMs(new Date(utcTime));
  }

  return new Date(utcTime).toISOString();
}
