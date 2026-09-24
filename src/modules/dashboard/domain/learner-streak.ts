const DAY_MS = 24 * 60 * 60 * 1000;
const COSTA_RICA_OFFSET_MS = 6 * 60 * 60 * 1000;

/**
 * Represents a Costa Rican calendar day as UTC midnight. The value is intended
 * for PostgreSQL DATE columns, not as the instant when that local day started.
 */
export function costaRicaCalendarDay(date: Date) {
  const local = new Date(date.getTime() - COSTA_RICA_OFFSET_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
  );
}

export function calculateCurrentLearnerStreak(
  activityDates: readonly Date[],
  now: Date,
) {
  const days = [...new Set(
    activityDates.map((date) =>
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    ),
  )].sort((left, right) => right - left);
  let expectedDay = costaRicaCalendarDay(now).getTime();
  let streak = 0;

  for (const day of days) {
    if (day > expectedDay) continue;
    if (day !== expectedDay) break;

    streak += 1;
    expectedDay -= DAY_MS;
  }

  return streak;
}

export function getLearnerStreakColorLevel(days: number) {
  return Math.min(Math.floor(Math.max(0, days) / 5), 4);
}
