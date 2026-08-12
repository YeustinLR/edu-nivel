import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, Role } from "../src/generated/prisma/client.ts";

function getEmailArgument() {
  const explicit = process.argv.find((argument) =>
    argument.startsWith("--email="),
  );
  const positional = process.argv
    .slice(2)
    .find((argument) => argument !== "--" && !argument.startsWith("--"));
  const email = explicit?.slice("--email=".length) ?? positional;
  return email?.trim().toLowerCase();
}

async function main() {
  const email = getEmailArgument();
  if (!email || process.argv.includes("--help")) {
    console.log(
      "Uso: pnpm admin:promote -- --email=administrador@ejemplo.com",
    );
    return;
  }

  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Configura DATABASE_URL_UNPOOLED o DATABASE_URL.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("No existe una cuenta con ese correo.");
    }
    if (!user.emailVerified) {
      throw new Error("La cuenta debe verificar su correo antes de promoverse.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.ADMIN },
    });
    console.log(`Cuenta promovida a ADMIN: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Error inesperado.");
  process.exitCode = 1;
});
