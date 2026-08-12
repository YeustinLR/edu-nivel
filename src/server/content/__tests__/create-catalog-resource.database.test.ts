import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/enums";

vi.mock("server-only", () => ({}));

const RUN_DATABASE_INTEGRATION = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)(
  "structured resource creation with PostgreSQL",
  () => {
    it(
      "creates specialized drafts idempotently and enforces module state",
      async () => {
        const { config } = await import("dotenv");
        config({ path: [".env.local", ".env"], quiet: true });

        const [{ prisma }, creation] = await Promise.all([
          import("@/server/db/prisma"),
          import("@/server/content/create-catalog-resource"),
        ]);
        const unique = randomUUID();
        const marker = `db-resource-${unique}`;
        const userId = marker;
        const levelNumber =
          1_600_000_000 + Number.parseInt(unique.slice(0, 7), 16);
        const actor = { id: userId, role: Role.ADMIN };
        let levelId: string | undefined;

        try {
          await prisma.user.create({
            data: {
              id: userId,
              name: "Resource Database Integration",
              email: `${marker}@example.com`,
              emailVerified: true,
              role: Role.ADMIN,
            },
          });
          const level = await prisma.level.create({
            data: { levelNumber, description: marker },
          });
          levelId = level.id;
          const subject = await prisma.subject.create({
            data: { levelId: level.id, name: `Materia ${marker}` },
          });
          const moduleRecord = await prisma.module.create({
            data: {
              subjectId: subject.id,
              title: `Módulo ${marker}`,
              audience: ContentAudience.BOTH,
              createdById: userId,
            },
          });

          const lessonRequest = {
            requestId: randomUUID(),
            moduleId: moduleRecord.id,
            resourceType: ResourceType.LESSON,
            title: `Lección ${marker}`,
            description: "Descripción",
            content: "Contenido de prueba",
            estimatedMinutes: 12,
            disposition: "DRAFT",
          } as const;
          const lesson = await creation.createCatalogStructuredResource(
            lessonRequest,
            actor,
          );
          const replay = await creation.createCatalogStructuredResource(
            lessonRequest,
            actor,
          );
          expect(replay.id).toBe(lesson.id);

          await expect(
            creation.createCatalogStructuredResource(
              { ...lessonRequest, title: "Solicitud modificada" },
              actor,
            ),
          ).rejects.toMatchObject({ code: "REQUEST_CONFLICT" });

          const didactic = await creation.createCatalogStructuredResource(
            {
              requestId: randomUUID(),
              moduleId: moduleRecord.id,
              resourceType: ResourceType.DIDACTIC,
              title: `Didáctico ${marker}`,
              description: undefined,
              content: "Actividad guiada",
              objective: "Comprender el contenido",
              disposition: "DRAFT",
            },
            actor,
          );
          const youtube = await creation.createCatalogStructuredResource(
            {
              requestId: randomUUID(),
              moduleId: moduleRecord.id,
              resourceType: ResourceType.YOUTUBE,
              title: `Video ${marker}`,
              description: undefined,
              videoId: "dQw4w9WgXcQ",
              startAt: 20,
              disposition: "DRAFT",
            },
            actor,
          );
          const link = await creation.createCatalogStructuredResource(
            {
              requestId: randomUUID(),
              moduleId: moduleRecord.id,
              resourceType: ResourceType.LINK,
              title: `Enlace ${marker}`,
              description: undefined,
              url: "https://example.com/recurso",
              openInNewTab: true,
              disposition: "DRAFT",
            },
            actor,
          );
          const note = await creation.createCatalogStructuredResource(
            {
              requestId: randomUUID(),
              moduleId: moduleRecord.id,
              resourceType: ResourceType.NOTE,
              title: `Nota ${marker}`,
              description: undefined,
              disposition: "DRAFT",
            },
            actor,
          );

          const persisted = await prisma.resource.findMany({
            where: {
              id: { in: [lesson.id, didactic.id, youtube.id, link.id, note.id] },
            },
            orderBy: { type: "asc" },
            select: {
              type: true,
              publicationStatus: true,
              lesson: { select: { content: true } },
              didacticResource: { select: { objective: true } },
              youtubeVideo: { select: { videoId: true, startAt: true } },
              linkResource: { select: { url: true, openInNewTab: true } },
            },
          });
          expect(persisted).toHaveLength(5);
          expect(
            persisted.every(
              (resource) =>
                resource.publicationStatus === PublicationStatus.DRAFT,
            ),
          ).toBe(true);
          expect(persisted.find((item) => item.type === ResourceType.LESSON))
            .toMatchObject({ lesson: { content: "Contenido de prueba" } });
          expect(persisted.find((item) => item.type === ResourceType.DIDACTIC))
            .toMatchObject({
              didacticResource: { objective: "Comprender el contenido" },
            });
          expect(persisted.find((item) => item.type === ResourceType.YOUTUBE))
            .toMatchObject({
              youtubeVideo: { videoId: "dQw4w9WgXcQ", startAt: 20 },
            });
          expect(persisted.find((item) => item.type === ResourceType.LINK))
            .toMatchObject({
              linkResource: {
                url: "https://example.com/recurso",
                openInNewTab: true,
              },
            });
          expect(persisted.find((item) => item.type === ResourceType.NOTE))
            .toMatchObject({
              type: ResourceType.NOTE,
              lesson: null,
              didacticResource: null,
              youtubeVideo: null,
              linkResource: null,
            });

          await prisma.module.update({
            where: { id: moduleRecord.id },
            data: { publicationStatus: PublicationStatus.PUBLISHED },
          });
          const publishedResource =
            await creation.createCatalogStructuredResource(
              {
                requestId: randomUUID(),
                moduleId: moduleRecord.id,
                resourceType: ResourceType.NOTE,
                title: `Nota publicada ${marker}`,
                description: undefined,
                disposition: "PUBLISH",
              },
              actor,
            );
          await expect(
            prisma.resource.findUniqueOrThrow({
              where: { id: publishedResource.id },
              select: {
                publicationStatus: true,
                publishedById: true,
                publishedAt: true,
              },
            }),
          ).resolves.toMatchObject({
            publicationStatus: PublicationStatus.PUBLISHED,
            publishedById: actor.id,
            publishedAt: expect.any(Date),
          });

          await prisma.module.update({
            where: { id: moduleRecord.id },
            data: { publicationStatus: PublicationStatus.IN_REVIEW },
          });
          await expect(
            creation.createCatalogStructuredResource(
              { ...lessonRequest, requestId: randomUUID() },
              actor,
            ),
          ).rejects.toMatchObject({ code: "MODULE_NOT_EDITABLE" });
        } finally {
          if (levelId) {
            await prisma.level.deleteMany({ where: { id: levelId } });
          }
          await prisma.user.deleteMany({ where: { id: userId } });
        }
      },
      30_000,
    );
  },
);
