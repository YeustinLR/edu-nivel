import { SubscriptionStatus } from "@/generated/prisma/client";

export function addUtcCalendarMonths(date: Date, months: number): Date {
  if (!Number.isInteger(months) || months <= 0) {
    throw new RangeError("La duracion debe ser un numero positivo de meses.");
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetFirstDay = new Date(
    Date.UTC(
      year,
      month + months,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      targetFirstDay.getUTCFullYear(),
      targetFirstDay.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  targetFirstDay.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  return targetFirstDay;
}

type ExistingSubscriptionPeriod = {
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
};

type SubscriptionPeriod = {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
};

/**
 * A confirmed payment extends any still-valid paid period from its current end,
 * including a canceled subscription that remains usable until period end.
 */
export function resolveSubscriptionPeriod(
  currentSubscription: ExistingSubscriptionPeriod | null,
  confirmedAt: Date,
  durationMonths: number,
): SubscriptionPeriod {
  const carriesExistingTime =
    (currentSubscription?.status === SubscriptionStatus.ACTIVE ||
      currentSubscription?.status === SubscriptionStatus.CANCELED) &&
    currentSubscription.currentPeriodEnd > confirmedAt;
  const currentPeriodStart = carriesExistingTime
    ? currentSubscription.currentPeriodStart
    : confirmedAt;
  const extensionBase = carriesExistingTime
    ? currentSubscription.currentPeriodEnd
    : confirmedAt;

  return {
    currentPeriodStart,
    currentPeriodEnd: addUtcCalendarMonths(extensionBase, durationMonths),
  };
}
