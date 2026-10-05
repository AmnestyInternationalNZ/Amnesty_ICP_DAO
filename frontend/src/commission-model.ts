export function formatLocalDateTime(nanoseconds: bigint): string {
  const date = new Date(Number(nanoseconds / 1_000_000n));
  const localTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localTime.toISOString().slice(0, 16);
}
export function parseLocalDateTime(value: string): bigint {
  const milliseconds = new Date(value).getTime();
  if (!Number.isFinite(milliseconds))
    throw new Error("Choose a valid date and time");
  return BigInt(milliseconds) * 1_000_000n;
}

export function consultationStatus(
  consultation: { opens: bigint; closes: bigint; closed: boolean },
  now = BigInt(Date.now()) * 1_000_000n,
): "Open" | "Closed" | "Upcoming" {
  if (consultation.closed || now > consultation.closes) return "Closed";
  return now < consultation.opens ? "Upcoming" : "Open";
}
