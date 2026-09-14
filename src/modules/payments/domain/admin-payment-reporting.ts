const DAY_MS = 24 * 60 * 60 * 1000;
const COSTA_RICA_OFFSET_MS = 6 * 60 * 60 * 1000;

export type PaymentReportingPeriod = {
  start: Date;
  end: Date;
};

export type AdminPaymentReportingPeriods = {
  currentMonth: PaymentReportingPeriod;
  previousComparableMonth: PaymentReportingPeriod;
  trend: PaymentReportingPeriod;
};

function costaRicaCalendarDate(date: Date) {
  return new Date(date.getTime() - COSTA_RICA_OFFSET_MS);
}

function costaRicaInstant(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
) {
  return new Date(
    Date.UTC(year, month, day, hours, minutes, seconds, milliseconds) +
      COSTA_RICA_OFFSET_MS,
  );
}

export function startOfCostaRicaMonth(date: Date, monthOffset = 0) {
  const local = costaRicaCalendarDate(date);
  return costaRicaInstant(
    local.getUTCFullYear(),
    local.getUTCMonth() + monthOffset,
    1,
  );
}

export function costaRicaMonthKey(date: Date) {
  const local = costaRicaCalendarDate(date);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getAdminPaymentReportingPeriods(
  now: Date,
): AdminPaymentReportingPeriods {
  const localNow = costaRicaCalendarDate(now);
  const currentMonthStart = startOfCostaRicaMonth(now);
  const previousMonthStart = startOfCostaRicaMonth(now, -1);
  const previousMonthEnd = currentMonthStart;
  const previousMonthLastDay = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 0),
  ).getUTCDate();
  const previousComparableEnd =
    localNow.getUTCDate() > previousMonthLastDay
      ? previousMonthEnd
      : costaRicaInstant(
          localNow.getUTCFullYear(),
          localNow.getUTCMonth() - 1,
          localNow.getUTCDate(),
          localNow.getUTCHours(),
          localNow.getUTCMinutes(),
          localNow.getUTCSeconds(),
          localNow.getUTCMilliseconds(),
        );

  return {
    currentMonth: { start: currentMonthStart, end: now },
    previousComparableMonth: {
      start: previousMonthStart,
      end: previousComparableEnd,
    },
    trend: { start: startOfCostaRicaMonth(now, -5), end: now },
  };
}

export function getAdminPaymentHistoryStart(
  period: "30d" | "90d" | "12m" | "all",
  now: Date,
) {
  if (period === "all") return undefined;
  if (period === "30d") return new Date(now.getTime() - 30 * DAY_MS);
  if (period === "90d") return new Date(now.getTime() - 90 * DAY_MS);

  const local = costaRicaCalendarDate(now);
  return costaRicaInstant(
    local.getUTCFullYear(),
    local.getUTCMonth() - 12,
    local.getUTCDate(),
    local.getUTCHours(),
    local.getUTCMinutes(),
    local.getUTCSeconds(),
    local.getUTCMilliseconds(),
  );
}

export function paymentMetricPercentage(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
