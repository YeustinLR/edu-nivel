import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
  UploadStatus,
} from "@/generated/prisma/enums";
import {
  normalizeResourceDocument,
  serializeResourceDocument,
} from "@/modules/content/domain/resource-document";

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
        let contentImageId: string | undefined;

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

          const requestId = randomUUID();
          contentImageId = randomUUID();
          await prisma.contentImage.create({
            data: {
              id: contentImageId,
              createdById: userId,
              editorSessionId: requestId,
              temporaryStorageKey: `pending/${contentImageId}.png`,
              storageKey: `content-images/${contentImageId}.png`,
              originalName: "diagrama.png",
              mimeType: "image/png",
              sizeBytes: BigInt(1_024),
              status: UploadStatus.CONFIRMED,
              uploadExpiresAt: new Date(Date.now() + 60_000),
              orphanExpiresAt: new Date(Date.now() + 60_000),
              confirmedAt: new Date(),
            },
          });
          const writtenContent = serializeResourceDocument(
            normalizeResourceDocument([
              {
                id: "paragraph",
                type: "paragraph",
                props: {},
                content: "Contenido de prueba",
                children: [],
              },
              {
                id: "image",
                type: "image",
                props: {
                  imageId: contentImageId,
                  altText: "Diagrama de prueba",
                  decorative: false,
                },
                children: [],
              },
            ]),
          );
          const contentRequest = {
            requestId,
            moduleId: moduleRecord.id,
            resourceType: ResourceType.NOTE,
            title: `Contenido ${marker}`,
            instructions: "Lee el contenido con atención",
            content: writtenContent,
            estimatedMinutes: 12,
            disposition: "DRAFT",
          } as const;
          const contentResource = await creation.createCatalogStructuredResource(
            contentRequest,
            actor,
          );
          const replay = await creation.createCatalogStructuredResource(
            contentRequest,
            actor,
          );
          expect(replay.id).toBe(contentResource.id);

          await expect(
            creation.createCatalogStructuredResource(
              { ...contentRequest, title: "Solicitud modificada" },
              actor,
            ),
          ).rejects.toMatchObject({ code: "REQUEST_CONFLICT" });

          const youtube = await creation.createCatalogStructuredResource(
            {
              requestId: randomUUID(),
              moduleId: moduleRecord.id,
              resourceType: ResourceType.YOUTUBE,
              title: `Video ${marker}`,
              instructions: undefined,
              content: "Explicación del video",
              estimatedMinutes: 8,
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
              instructions: undefined,
              content: "Explicación del vínculo",
              estimatedMinutes: undefined,
              url: "https://example.com/recurso",
              openInNewTab: true,
              disposition: "DRAFT",
            },
            actor,
          );
          const persisted = await prisma.resource.findMany({
            where: {
              id: { in: [contentResource.id, youtube.id, link.id] },
            },
            orderBy: { type: "asc" },
            select: {
              type: true,
              instructions: true,
              content: true,
              estimatedMinutes: true,
              publicationStatus: true,
              youtubeVideo: { select: { videoId: true, startAt: true } },
              linkResource: { select: { url: true, openInNewTab: true } },
              contentImages: { select: { contentImageId: true } },
            },
          });
          expect(persisted).toHaveLength(3);
          expect(
            persisted.every(
              (resource) =>
                resource.publicationStatus === PublicationStatus.DRAFT,
            ),
          ).toBe(true);
          expect(persisted.find((item) => item.type === ResourceType.NOTE))
            .toMatchObject({
              instructions: "Lee el contenido con atención",
              content: writtenContent,
              estimatedMinutes: 12,
              contentImages: [{ contentImageId }],
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
                instructions: undefined,
                content: "Contenido publicado",
                estimatedMinutes: undefined,
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
              { ...contentRequest, requestId: randomUUID() },
              actor,
            ),
          ).rejects.toMatchObject({ code: "MODULE_NOT_EDITABLE" });
        } finally {
          if (levelId) {
            await prisma.level.deleteMany({ where: { id: levelId } });
          }
          if (contentImageId) {
            await prisma.contentImage.deleteMany({ where: { id: contentImageId } });
          }
          await prisma.user.deleteMany({ where: { id: userId } });
        }
      },
      30_000,
    );
  },
);
