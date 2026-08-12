import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  ResourceType,
  Role,
} from "@/generated/prisma/enums";

vi.mock("server-only", () => ({}));

const RUN_DATABASE_INTEGRATION =
  process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)(
  "content updates with PostgreSQL",
  () => {
    it(
      "enforces authorship, editorial state, dependencies and optimistic concurrency",
      async () => {
        const { config } = await import("dotenv");
        config({ path: [".env.local", ".env"], quiet: true });

        const [{ prisma }, updates, availability] = await Promise.all([
          import("@/server/db/prisma"),
          import("@/server/content/update-content"),
          import("@/server/content/set-content-availability"),
        ]);
        const unique = randomUUID();
        const marker = `db-content-update-${unique}`;
        const adminId = `${marker}-admin`;
        const collaboratorId = `${marker}-collaborator`;
        const levelNumber =
          1_700_000_000 + Number.parseInt(unique.slice(0, 6), 16);
        let levelId: string | undefined;

        try {
          await prisma.user.createMany({
            data: [
              {
                id: adminId,
                name: "Content Update Admin",
                email: `${adminId}@example.com`,
                emailVerified: true,
                role: Role.ADMIN,
              },
              {
                id: collaboratorId,
                name: "Content Update Collaborator",
                email: `${collaboratorId}@example.com`,
                emailVerified: true,
                role: Role.COLLABORATOR,
              },
            ],
          });
          const level = await prisma.level.create({
            data: { levelNumber, description: marker },
          });
          levelId = level.id;
          const subject = await prisma.subject.create({
            data: { levelId: level.id, name: `Materia ${marker}` },
          });
          const ownedModule = await prisma.module.create({
            data: {
              subjectId: subject.id,
              title: `Módulo propio ${marker}`,
              audience: ContentAudience.BOTH,
              createdById: collaboratorId,
            },
          });
          const adminModule = await prisma.module.create({
            data: {
              subjectId: subject.id,
              title: `Módulo administrador ${marker}`,
              audience: ContentAudience.BOTH,
              createdById: adminId,
            },
          });
          const lessonResource = await prisma.resource.create({
            data: {
              moduleId: ownedModule.id,
              type: "LESSON",
              title: `Lección ${marker}`,
              createdById: collaboratorId,
              lesson: {
                create: { content: "Contenido inicial", estimatedMinutes: 5 },
              },
            },
          });
          const didacticResource = await prisma.resource.create({
            data: {
              moduleId: ownedModule.id,
              type: ResourceType.DIDACTIC,
              title: `Material ${marker}`,
              createdById: collaboratorId,
              didacticResource: {
                create: {
                  content: "Contenido didáctico inicial",
                  objective: "Objetivo inicial",
                },
              },
            },
          });
          const youtubeResource = await prisma.resource.create({
            data: {
              moduleId: ownedModule.id,
              type: ResourceType.YOUTUBE,
              title: `Video ${marker}`,
              createdById: collaboratorId,
              youtubeVideo: {
                create: { videoId: "dQw4w9WgXcQ", startAt: 0 },
              },
            },
          });
          const linkResource = await prisma.resource.create({
            data: {
              moduleId: ownedModule.id,
              type: ResourceType.LINK,
              title: `Enlace ${marker}`,
              createdById: collaboratorId,
              linkResource: {
                create: {
                  url: "https://example.com/inicial",
                  openInNewTab: true,
                },
              },
            },
          });

          await updates.updateCatalogModule(
            {
              id: ownedModule.id,
              expectedUpdatedAt: ownedModule.updatedAt.toISOString(),
              title: `Módulo actualizado ${marker}`,
              description: "Actualizado por su autor",
              audience: ContentAudience.STUDENT,
            },
            { id: collaboratorId, role: Role.COLLABORATOR },
          );

          await expect(
            updates.updateCatalogModule(
              {
                id: ownedModule.id,
                expectedUpdatedAt: ownedModule.updatedAt.toISOString(),
                title: `Edición obsoleta ${marker}`,
                description: undefined,
                audience: ContentAudience.BOTH,
              },
              { id: collaboratorId, role: Role.COLLABORATOR },
            ),
          ).rejects.toMatchObject({ code: "EDIT_CONFLICT" });

          await expect(
            updates.updateCatalogModule(
              {
                id: adminModule.id,
                expectedUpdatedAt: adminModule.updatedAt.toISOString(),
                title: `Intento ajeno ${marker}`,
                description: undefined,
                audience: ContentAudience.BOTH,
              },
              { id: collaboratorId, role: Role.COLLABORATOR },
            ),
          ).rejects.toMatchObject({ code: "FORBIDDEN" });

          const publishedAdminModule = await prisma.module.update({
            where: { id: adminModule.id },
            data: { publicationStatus: "PUBLISHED" },
          });
          await expect(
            updates.updateCatalogModule(
              {
                id: publishedAdminModule.id,
                expectedUpdatedAt:
                  publishedAdminModule.updatedAt.toISOString(),
                title: `Cambio publicado ${marker}`,
                description: undefined,
                audience: ContentAudience.BOTH,
              },
              { id: adminId, role: Role.ADMIN },
            ),
          ).resolves.toBeUndefined();

          await updates.updateCatalogResource(
            {
              id: lessonResource.id,
              expectedUpdatedAt: lessonResource.updatedAt.toISOString(),
              resourceType: ResourceType.LESSON,
              title: `Lección actualizada ${marker}`,
              description: "Contenido editable",
              content: "Contenido persistido de la lección",
              estimatedMinutes: 8,
            },
            { id: collaboratorId, role: Role.COLLABORATOR },
          );

          await expect(
            prisma.lesson.findUniqueOrThrow({
              where: { resourceId: lessonResource.id },
              select: { content: true, estimatedMinutes: true },
            }),
          ).resolves.toEqual({
            content: "Contenido persistido de la lección",
            estimatedMinutes: 8,
          });

          await updates.updateCatalogResource(
            {
              id: didacticResource.id,
              expectedUpdatedAt: didacticResource.updatedAt.toISOString(),
              resourceType: ResourceType.DIDACTIC,
              title: `Material actualizado ${marker}`,
              description: undefined,
              content: "Contenido didáctico actualizado",
              objective: "Objetivo actualizado",
            },
            { id: collaboratorId, role: Role.COLLABORATOR },
          );
          await updates.updateCatalogResource(
            {
              id: youtubeResource.id,
              expectedUpdatedAt: youtubeResource.updatedAt.toISOString(),
              resourceType: ResourceType.YOUTUBE,
              title: `Video actualizado ${marker}`,
              description: undefined,
              videoId: "9bZkp7q19f0",
              startAt: 45,
            },
            { id: collaboratorId, role: Role.COLLABORATOR },
          );
          await updates.updateCatalogResource(
            {
              id: linkResource.id,
              expectedUpdatedAt: linkResource.updatedAt.toISOString(),
              resourceType: ResourceType.LINK,
              title: `Enlace actualizado ${marker}`,
              description: undefined,
              url: "https://example.com/actualizado",
              openInNewTab: false,
            },
            { id: collaboratorId, role: Role.COLLABORATOR },
          );

          const [didacticData, youtubeData, linkData] = await Promise.all([
            prisma.didacticResource.findUniqueOrThrow({
              where: { resourceId: didacticResource.id },
              select: { content: true, objective: true },
            }),
            prisma.youtubeVideo.findUniqueOrThrow({
              where: { resourceId: youtubeResource.id },
              select: { videoId: true, startAt: true },
            }),
            prisma.linkResource.findUniqueOrThrow({
              where: { resourceId: linkResource.id },
              select: { url: true, openInNewTab: true },
            }),
          ]);
          expect(didacticData).toEqual({
            content: "Contenido didáctico actualizado",
            objective: "Objetivo actualizado",
          });
          expect(youtubeData).toEqual({ videoId: "9bZkp7q19f0", startAt: 45 });
          expect(linkData).toEqual({
            url: "https://example.com/actualizado",
            openInNewTab: false,
          });

          const currentLink = await prisma.resource.findUniqueOrThrow({
            where: { id: linkResource.id },
            select: { updatedAt: true },
          });
          await expect(
            updates.updateCatalogResource(
              {
                id: linkResource.id,
                expectedUpdatedAt: currentLink.updatedAt.toISOString(),
                resourceType: ResourceType.YOUTUBE,
                title: `Tipo manipulado ${marker}`,
                description: undefined,
                videoId: "dQw4w9WgXcQ",
                startAt: 0,
              },
              { id: collaboratorId, role: Role.COLLABORATOR },
            ),
          ).rejects.toMatchObject({ code: "INVALID_RESOURCE_DATA" });

          await prisma.resource.update({
            where: { id: lessonResource.id },
            data: { publicationStatus: "PUBLISHED" },
          });
          const currentModule = await prisma.module.findUniqueOrThrow({
            where: { id: ownedModule.id },
            select: { updatedAt: true },
          });
          await expect(
            availability.setCatalogContentAvailability(
              {
                id: ownedModule.id,
                type: "module",
                isActive: false,
                expectedUpdatedAt: currentModule.updatedAt.toISOString(),
              },
              { id: collaboratorId, role: Role.COLLABORATOR },
            ),
          ).rejects.toMatchObject({ code: "DEPENDENCY_BLOCKED" });
        } finally {
          if (levelId) {
            await prisma.level.deleteMany({ where: { id: levelId } });
          }
          await prisma.user.deleteMany({
            where: { id: { in: [adminId, collaboratorId] } },
          });
        }
      },
      30_000,
    );
  },
);
