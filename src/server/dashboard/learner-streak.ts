import "server-only";

import {
  calculateCurrentLearnerStreak,
  costaRicaCalendarDay,
} from "@/modules/dashboard/domain/learner-streak";
import { prisma } from "@/server/db/prisma";

export async function recordLearnerDashboardVisit(
  userId: string,
  now = new Date(),
) {
  const activityDate = costaRicaCalendarDay(now);

  await prisma.learnerActivityDay.upsert({
    where: {
      userId_activityDate: { userId, activityDate },
    },
    create: { userId, activityDate },
    update: {},
  });

  const activityDays = await prisma.learnerActivityDay.findMany({
    where: { userId, activityDate: { lte: activityDate } },
    orderBy: { activityDate: "desc" },
    select: { activityDate: true },
  });

  return calculateCurrentLearnerStreak(
    activityDays.map((activity) => activity.activityDate),
    now,
  );
}
