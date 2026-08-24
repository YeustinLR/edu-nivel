import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";

function argument(name: string) {
  return process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .trim();
}

async function main() {
  const email = argument("email")?.toLowerCase();
  const levelNumber = Number(argument("level"));
  if (!email || !Number.isInteger(levelNumber)) {
    throw new Error(
      "Uso: pnpm onvo:audit -- --email=student@test.local --level=1",
    );
  }

  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no esta configurada.");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        emailVerified: true,
        selectedLevelId: true,
      },
    });
    const level = await prisma.level.findUnique({
      where: { levelNumber },
      select: { id: true, levelNumber: true, isActive: true, requiresSubscription: true },
    });
    if (!user || !level) throw new Error("Usuario o nivel no encontrado.");

    const [payments, subscription] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: user.id, levelId: level.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          planCode: true,
          expectedAmountMinor: true,
          receivedAmountMinor: true,
          currency: true,
          providerMode: true,
          providerStatus: true,
          providerPaymentIntentId: true,
          status: true,
          confirmedAt: true,
          appliedAt: true,
          staleAt: true,
          errorCode: true,
          createdAt: true,
          updatedAt: true,
          refunds: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              providerRefundId: true,
              providerMode: true,
              expectedAmountMinor: true,
              providerAmountMinor: true,
              currency: true,
              status: true,
              providerStatus: true,
              requestedAt: true,
              providerCreatedAt: true,
              providerUpdatedAt: true,
              lastCheckedAt: true,
              appliedAt: true,
              errorCode: true,
            },
          },
        },
      }),
      prisma.subscription.findUnique({
        where: { userId_levelId: { userId: user.id, levelId: level.id } },
        select: {
          id: true,
          product: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          lastPlanCode: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    console.log(
      JSON.stringify(
        { capturedAt: new Date().toISOString(), user, level, payments, subscription },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Error inesperado.");
  process.exitCode = 1;
});
