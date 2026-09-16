import "server-only";

import type {
  ContentRevisionStatus,
  PublicationStatus,
} from "@/generated/prisma/enums";
import {
  asModuleRevisionPayload,
  asResourceRevisionPayload,
} from "@/server/content/content-revisions";
import { prisma } from "@/server/db/prisma";

export type CollaboratorDashboardItemKind = "module" | "resource";

export type CollaboratorDashboardWorkItem = {
  id: string;
  kind: CollaboratorDashboardItemKind;
  title: string;
  context: string;
  status: PublicationStatus | ContentRevisionStatus;
  href: string;
  updatedAt: Date;
  lastEditorName: string;
  reviewNote: string | null;
};

export type CollaboratorDashboardActivityItem = {
  key: string;
  actorName: string;
  action: string;
  title: string;
  href: string;
  occurredAt: Date;
};

export type CollaboratorDashboardData = {
  attention: CollaboratorDashboardWorkItem[];
  continueWorking: CollaboratorDashboardWorkItem[];
  inReview: CollaboratorDashboardWorkItem[];
  teamActivity: CollaboratorDashboardActivityItem[];
  generatedAt: Date;
};

const activeHierarchy = {
  isActive: true,
  subject: { isActive: true, level: { isActive: true } },
} as const;

function moduleHref(id: string) {
  return `/dashboard/collaborator/content/modules/${encodeURIComponent(id)}`;
}

function resourceHref(id: string) {
  return `/dashboard/collaborator/content/resources/${encodeURIComponent(id)}`;
}

function moduleContext(moduleRecord: {
  subject: { name: string; level: { levelNumber: number } };
}) {
  return `Nivel ${moduleRecord.subject.level.levelNumber} / ${moduleRecord.subject.name}`;
}

function resourceContext(resource: {
  module: {
    title: string;
    subject: { name: string; level: { levelNumber: number } };
  };
}) {
  return `Nivel ${resource.module.subject.level.levelNumber} / ${resource.module.subject.name} / ${resource.module.title}`;
}

function latestDate(...dates: Array<Date | null | undefined>) {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    return !latest || date > latest ? date : latest;
  }, null);
}

function sameMoment(left: Date | null | undefined, right: Date | null) {
  return Boolean(
    left && right && Math.abs(left.getTime() - right.getTime()) <= 2_000,
  );
}

export async function getCollaboratorDashboardData(
  userId: string,
): Promise<CollaboratorDashboardData> {
  const [
    changeModules,
    changeResources,
    changeRevisions,
    draftModules,
    draftResources,
    draftRevisions,
    reviewModules,
    reviewResources,
    reviewRevisions,
    recentModules,
    recentResources,
    recentRevisions,
  ] = await Promise.all([
    prisma.module.findMany({
      where: {
        ...activeHierarchy,
        publicationStatus: "CHANGES_REQUESTED",
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        reviewNote: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        subject: {
          select: {
            name: true,
            level: { select: { levelNumber: true } },
          },
        },
      },
    }),
    prisma.resource.findMany({
      where: {
        isActive: true,
        publicationStatus: "CHANGES_REQUESTED",
        module: activeHierarchy,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        reviewNote: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        module: {
          select: {
            title: true,
            subject: {
              select: {
                name: true,
                level: { select: { levelNumber: true } },
              },
            },
          },
        },
      },
    }),
    prisma.contentRevision.findMany({
      where: {
        status: "CHANGES_REQUESTED",
        OR: [
          { module: activeHierarchy },
          { resource: { isActive: true, module: activeHierarchy } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      include: {
        updatedBy: { select: { name: true } },
        module: {
          select: {
            id: true,
            subject: {
              select: {
                name: true,
                level: { select: { levelNumber: true } },
              },
            },
          },
        },
        resource: {
          select: {
            id: true,
            module: {
              select: {
                title: true,
                subject: {
                  select: {
                    name: true,
                    level: { select: { levelNumber: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.module.findMany({
      where: {
        ...activeHierarchy,
        publicationStatus: { in: ["DRAFT", "UNPUBLISHED"] },
        OR: [{ createdById: userId }, { updatedById: userId }],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        reviewNote: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        subject: {
          select: {
            name: true,
            level: { select: { levelNumber: true } },
          },
        },
      },
    }),
    prisma.resource.findMany({
      where: {
        isActive: true,
        publicationStatus: { in: ["DRAFT", "UNPUBLISHED"] },
        OR: [{ createdById: userId }, { updatedById: userId }],
        module: activeHierarchy,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        reviewNote: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        module: {
          select: {
            title: true,
            subject: {
              select: {
                name: true,
                level: { select: { levelNumber: true } },
              },
            },
          },
        },
      },
    }),
    prisma.contentRevision.findMany({
      where: {
        status: "DRAFT",
        OR: [
          {
            updatedById: userId,
            module: activeHierarchy,
          },
          {
            updatedById: userId,
            resource: { isActive: true, module: activeHierarchy },
          },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      include: {
        updatedBy: { select: { name: true } },
        module: {
          select: {
            id: true,
            subject: {
              select: {
                name: true,
                level: { select: { levelNumber: true } },
              },
            },
          },
        },
        resource: {
          select: {
            id: true,
            module: {
              select: {
                title: true,
                subject: {
                  select: {
                    name: true,
                    level: { select: { levelNumber: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.module.findMany({
      where: {
        ...activeHierarchy,
        publicationStatus: "IN_REVIEW",
        OR: [
          { submittedById: userId },
          { submittedById: null, createdById: userId },
        ],
      },
      orderBy: [{ submittedForReviewAt: "desc" }, { id: "asc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        reviewNote: true,
        submittedForReviewAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        subject: {
          select: {
            name: true,
            level: { select: { levelNumber: true } },
          },
        },
      },
    }),
    prisma.resource.findMany({
      where: {
        isActive: true,
        publicationStatus: "IN_REVIEW",
        OR: [
          { submittedById: userId },
          { submittedById: null, createdById: userId },
        ],
        module: activeHierarchy,
      },
      orderBy: [{ submittedForReviewAt: "desc" }, { id: "asc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        reviewNote: true,
        submittedForReviewAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        module: {
          select: {
            title: true,
            subject: {
              select: {
                name: true,
                level: { select: { levelNumber: true } },
              },
            },
          },
        },
      },
    }),
    prisma.contentRevision.findMany({
      where: {
        status: "IN_REVIEW",
        OR: [
          { submittedById: userId, module: activeHierarchy },
          {
            submittedById: userId,
            resource: { isActive: true, module: activeHierarchy },
          },
        ],
      },
      orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
      take: 5,
      include: {
        updatedBy: { select: { name: true } },
        module: {
          select: {
            id: true,
            subject: {
              select: {
                name: true,
                level: { select: { levelNumber: true } },
              },
            },
          },
        },
        resource: {
          select: {
            id: true,
            module: {
              select: {
                title: true,
                subject: {
                  select: {
                    name: true,
                    level: { select: { levelNumber: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.module.findMany({
      where: activeHierarchy,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        updatedAt: true,
        submittedForReviewAt: true,
        reviewedAt: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        submittedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.resource.findMany({
      where: { isActive: true, module: activeHierarchy },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        publicationStatus: true,
        updatedAt: true,
        submittedForReviewAt: true,
        reviewedAt: true,
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        submittedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
    prisma.contentRevision.findMany({
      where: {
        OR: [
          { module: activeHierarchy },
          { resource: { isActive: true, module: activeHierarchy } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 6,
      include: {
        updatedBy: { select: { name: true } },
        submittedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        module: { select: { id: true } },
        resource: { select: { id: true } },
      },
    }),
  ]);

  const revisionWorkItems = (
    revisions: typeof changeRevisions | typeof draftRevisions | typeof reviewRevisions,
  ) =>
    revisions.flatMap<CollaboratorDashboardWorkItem>((revision) => {
      if (revision.module) {
        const payload = asModuleRevisionPayload(revision.payload);
        return [{
          id: revision.module.id,
          kind: "module",
          title: payload.title,
          context: moduleContext(revision.module),
          status: revision.status,
          href: moduleHref(revision.module.id),
          updatedAt: revision.updatedAt,
          lastEditorName: revision.updatedBy.name,
          reviewNote: revision.reviewNote,
        }];
      }
      if (revision.resource) {
        const payload = asResourceRevisionPayload(revision.payload);
        return [{
          id: revision.resource.id,
          kind: "resource",
          title: payload.title,
          context: resourceContext(revision.resource),
          status: revision.status,
          href: resourceHref(revision.resource.id),
          updatedAt: revision.updatedAt,
          lastEditorName: revision.updatedBy.name,
          reviewNote: revision.reviewNote,
        }];
      }
      return [];
    });

  const mapModules = (
    modules: typeof changeModules | typeof draftModules | typeof reviewModules,
  ): CollaboratorDashboardWorkItem[] =>
    modules.map((moduleRecord) => ({
      id: moduleRecord.id,
      kind: "module",
      title: moduleRecord.title,
      context: moduleContext(moduleRecord),
      status: moduleRecord.publicationStatus,
      href: moduleHref(moduleRecord.id),
      updatedAt:
        "submittedForReviewAt" in moduleRecord &&
        moduleRecord.submittedForReviewAt
          ? moduleRecord.submittedForReviewAt
          : moduleRecord.updatedAt,
      lastEditorName:
        moduleRecord.updatedBy?.name ?? moduleRecord.createdBy.name,
      reviewNote: moduleRecord.reviewNote,
    }));

  const mapResources = (
    resources:
      | typeof changeResources
      | typeof draftResources
      | typeof reviewResources,
  ): CollaboratorDashboardWorkItem[] =>
    resources.map((resource) => ({
      id: resource.id,
      kind: "resource",
      title: resource.title,
      context: resourceContext(resource),
      status: resource.publicationStatus,
      href: resourceHref(resource.id),
      updatedAt:
        "submittedForReviewAt" in resource &&
        resource.submittedForReviewAt
          ? resource.submittedForReviewAt
          : resource.updatedAt,
      lastEditorName: resource.updatedBy?.name ?? resource.createdBy.name,
      reviewNote: resource.reviewNote,
    }));

  const sortWorkItems = (items: CollaboratorDashboardWorkItem[], take: number) =>
    items
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() ||
          left.id.localeCompare(right.id),
      )
      .slice(0, take);

  const baseActivity = [
    ...recentModules.map((item) => ({ ...item, kind: "module" as const })),
    ...recentResources.map((item) => ({ ...item, kind: "resource" as const })),
  ].map<CollaboratorDashboardActivityItem>((item) => {
    const occurredAt =
      latestDate(item.reviewedAt, item.submittedForReviewAt, item.updatedAt) ??
      item.updatedAt;
    const isReviewDecision = sameMoment(item.reviewedAt, occurredAt);
    const isSubmission = sameMoment(item.submittedForReviewAt, occurredAt);
    const action = isReviewDecision
      ? item.publicationStatus === "CHANGES_REQUESTED"
        ? "solicitó cambios en"
        : "aprobó"
      : isSubmission
        ? "envió a revisión"
        : item.updatedBy
          ? "editó"
          : "creó";
    const actorName = isReviewDecision
      ? item.reviewedBy?.name
      : isSubmission
        ? item.submittedBy?.name
        : item.updatedBy?.name ?? item.createdBy.name;

    return {
      key: `${item.kind}-${item.id}-${occurredAt.toISOString()}`,
      actorName: actorName ?? "El equipo editorial",
      action,
      title: item.title,
      href:
        item.kind === "module" ? moduleHref(item.id) : resourceHref(item.id),
      occurredAt,
    };
  });

  const revisionActivity = recentRevisions.flatMap<CollaboratorDashboardActivityItem>(
    (revision) => {
      const targetId = revision.module?.id ?? revision.resource?.id;
      if (!targetId) return [];
      const isModule = Boolean(revision.module);
      const title = isModule
        ? asModuleRevisionPayload(revision.payload).title
        : asResourceRevisionPayload(revision.payload).title;
      const occurredAt =
        latestDate(revision.reviewedAt, revision.submittedAt, revision.updatedAt) ??
        revision.updatedAt;
      const isReviewDecision = sameMoment(revision.reviewedAt, occurredAt);
      const isSubmission = sameMoment(revision.submittedAt, occurredAt);
      const action = isReviewDecision
        ? "solicitó cambios en"
        : isSubmission
          ? "envió una revisión de"
          : "editó una revisión de";
      const actorName = isReviewDecision
        ? revision.reviewedBy?.name
        : isSubmission
          ? revision.submittedBy?.name
          : revision.updatedBy.name;

      return [{
        key: `revision-${revision.id}-${occurredAt.toISOString()}`,
        actorName: actorName ?? "El equipo editorial",
        action,
        title,
        href: isModule ? moduleHref(targetId) : resourceHref(targetId),
        occurredAt,
      }];
    },
  );

  return {
    attention: sortWorkItems(
      [
        ...mapModules(changeModules),
        ...mapResources(changeResources),
        ...revisionWorkItems(changeRevisions),
      ],
      5,
    ),
    continueWorking: sortWorkItems(
      [
        ...mapModules(draftModules),
        ...mapResources(draftResources),
        ...revisionWorkItems(draftRevisions),
      ],
      5,
    ),
    inReview: sortWorkItems(
      [
        ...mapModules(reviewModules),
        ...mapResources(reviewResources),
        ...revisionWorkItems(reviewRevisions),
      ],
      4,
    ),
    teamActivity: [...baseActivity, ...revisionActivity]
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          left.key.localeCompare(right.key),
      )
      .slice(0, 6),
    generatedAt: new Date(),
  };
}
