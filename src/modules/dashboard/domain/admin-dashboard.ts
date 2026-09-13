const DAY_MS = 24 * 60 * 60 * 1000;
const COSTA_RICA_OFFSET_MS = 6 * 60 * 60 * 1000;

export type DashboardPeriod = {
  start: Date;
  end: Date;
};

export type DashboardPeriods = {
  current30Days: DashboardPeriod;
  previous30Days: DashboardPeriod;
  current7Days: DashboardPeriod;
  previous7Days: DashboardPeriod;
};

export type MetricComparison = {
  current: number;
  previous: number | null;
};

export type MetricDelta = {
  absolute: number;
  percentage: number | null;
  direction: "up" | "down" | "flat";
};

export type CollectionEvent = {
  amountMinor: number;
  occurredAt: Date;
};

export type CollectionTrendBucket = {
  start: Date;
  end: Date;
  amountMinor: number;
};

export function getAdminDashboardPeriods(now: Date): DashboardPeriods {
  const current30Start = new Date(now.getTime() - 30 * DAY_MS);
  const current7Start = new Date(now.getTime() - 7 * DAY_MS);

  return {
    current30Days: { start: current30Start, end: now },
    previous30Days: {
      start: new Date(current30Start.getTime() - 30 * DAY_MS),
      end: current30Start,
    },
    current7Days: { start: current7Start, end: now },
    previous7Days: {
      start: new Date(current7Start.getTime() - 7 * DAY_MS),
      end: current7Start,
    },
  };
}

export function isInPeriod(date: Date, period: DashboardPeriod) {
  return date >= period.start && date < period.end;
}

export function collectedInPeriod(
  payments: readonly CollectionEvent[],
  period: DashboardPeriod,
) {
  return payments.reduce(
    (total, payment) =>
      isInPeriod(payment.occurredAt, period)
        ? total + payment.amountMinor
        : total,
    0,
  );
}

export function getMetricDelta(
  comparison: MetricComparison,
): MetricDelta | null {
  if (comparison.previous === null) return null;

  const absolute = comparison.current - comparison.previous;
  return {
    absolute,
    percentage:
      comparison.previous === 0
        ? null
        : (absolute / Math.abs(comparison.previous)) * 100,
    direction: absolute > 0 ? "up" : absolute < 0 ? "down" : "flat",
  };
}

/**
 * Costa Rica uses UTC-06:00 year round. Shifting first lets UTC accessors operate
 * on Costa Rican calendar fields without depending on the server time zone.
 */
function startOfCostaRicaWeek(date: Date) {
  const local = new Date(date.getTime() - COSTA_RICA_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const localMonday = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysSinceMonday,
  );

  return new Date(localMonday + COSTA_RICA_OFFSET_MS);
}

export function buildWeeklyCollectionTrend(
  payments: readonly CollectionEvent[],
  period: DashboardPeriod,
): CollectionTrendBucket[] {
  const buckets: CollectionTrendBucket[] = [];
  let calendarWeekStart = startOfCostaRicaWeek(period.start);

  while (calendarWeekStart < period.end) {
    const calendarWeekEnd = new Date(calendarWeekStart.getTime() + 7 * DAY_MS);
    const start = new Date(
      Math.max(calendarWeekStart.getTime(), period.start.getTime()),
    );
    const end = new Date(
      Math.min(calendarWeekEnd.getTime(), period.end.getTime()),
    );

    buckets.push({
      start,
      end,
      amountMinor: collectedInPeriod(payments, { start, end }),
    });
    calendarWeekStart = calendarWeekEnd;
  }

  return buckets;
}
