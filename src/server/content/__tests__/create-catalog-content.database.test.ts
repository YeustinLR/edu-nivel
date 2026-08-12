import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  Role,
} from "@/generated/prisma/enums";

vi.mock("server-only", () => ({}));

const RUN_DATABASE_INTEGRATION =
  process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)(
  "catalog content creation with PostgreSQL",
  () => {
    it(
      "persists the hierarchy and rejects invalid relationships and duplicates",
      async () => {
        const { config } = await import("dotenv");
        config({ path: [".env.local", ".env"], quiet: true });

        const [{ prisma }, creation] = await Promise.all([
          import("@/server/db/prisma"),
          import("@/server/content/create-catalog-content"),
        ]);
        const unique = randomUUID();
        const marker = `db-content-${unique}`;
        const userId = marker;
        const levelNumber =
          1_500_000_000 + Number.parseInt(unique.slice(0, 7), 16);
        let levelId: string | undefined;

        try {
          await prisma.user.create({
            data: {
              id: userId,
              name: "Content Database Integration",
              email: `${marker}@example.com`,
              emailVerified: true,
              role: Role.ADMIN,
            },
          });

          const level = await creation.createCatalogLevel({
            levelNumber,
            description: marker,
            requiresSubscription: true,
          });
          levelId = level.id;

          const subject = await creation.createCatalogSubject({
            levelId: level.id,
            name: `Materia ${marker}`,
            description: marker,
          });

          const moduleRecord = await creation.createCatalogModule(
            {
              subjectId: subject.id,
              title: `Módulo ${marker}`,
              description: marker,
              audience: ContentAudience.BOTH,
              disposition: "PUBLISH",
            },
            userId,
          );

          await expect(
            prisma.module.findUniqueOrThrow({
              where: { id: moduleRecord.id },
              select: {
                publicationStatus: true,
                createdById: true,
                audience: true,
                subject: { select: { levelId: true } },
              },
            }),
          ).resolves.toEqual({
            publicationStatus: PublicationStatus.PUBLISHED,
            createdById: userId,
            audience: ContentAudience.BOTH,
            subject: { levelId: level.id },
          });

          await expect(
            creation.createCatalogLevel({
              levelNumber,
              description: marker,
              requiresSubscription: true,
            }),
          ).rejects.toMatchObject({ code: "DUPLICATE_LEVEL" });

          await expect(
            creation.createCatalogSubject({
              levelId: level.id,
              name: subject.name,
              description: marker,
            }),
          ).rejects.toMatchObject({ code: "DUPLICATE_SUBJECT" });

          await expect(
            creation.createCatalogModule(
              {
                subjectId: subject.id,
                title: moduleRecord.title,
                description: marker,
                audience: ContentAudience.BOTH,
                disposition: "PUBLISH",
              },
              userId,
            ),
          ).rejects.toMatchObject({ code: "DUPLICATE_MODULE" });

          await expect(
            creation.createCatalogSubject({
              levelId: `missing-${unique}`,
              name: `Materia inexistente ${marker}`,
              description: marker,
            }),
          ).rejects.toMatchObject({ code: "LEVEL_NOT_FOUND" });

          await prisma.level.update({
            where: { id: level.id },
            data: { isActive: false },
          });

          await expect(
            creation.createCatalogSubject({
              levelId: level.id,
              name: `Materia en nivel inactivo ${marker}`,
              description: marker,
            }),
          ).rejects.toMatchObject({ code: "LEVEL_NOT_ACTIVE" });

          await prisma.level.update({
            where: { id: level.id },
            data: { isActive: true },
          });

          await expect(
            creation.createCatalogModule(
              {
                subjectId: `missing-${unique}`,
                title: `Módulo inexistente ${marker}`,
                description: marker,
                audience: ContentAudience.BOTH,
                disposition: "PUBLISH",
              },
              userId,
            ),
          ).rejects.toMatchObject({ code: "SUBJECT_NOT_FOUND" });

          await prisma.subject.update({
            where: { id: subject.id },
            data: { isActive: false },
          });

          await expect(
            creation.createCatalogModule(
              {
                subjectId: subject.id,
                title: `Módulo inactivo ${marker}`,
                description: marker,
                audience: ContentAudience.BOTH,
                disposition: "PUBLISH",
              },
              userId,
            ),
          ).rejects.toMatchObject({ code: "SUBJECT_NOT_ACTIVE" });
        } finally {
          await prisma.module.deleteMany({ where: { createdById: userId } });
          if (levelId) {
            await prisma.subject.deleteMany({ where: { levelId } });
            await prisma.level.deleteMany({ where: { id: levelId } });
          } else {
            await prisma.level.deleteMany({
              where: { description: marker },
            });
          }
          await prisma.user.deleteMany({ where: { id: userId } });
        }
      },
      30_000,
    );
  },
);
