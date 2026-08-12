import "server-only";

import { prisma } from "@/server/db/prisma";

export type AdminCatalogSubject = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  moduleCount: number;
};

export type AdminCatalogLevel = {
  id: string;
  levelNumber: number;
  description: string | null;
  isActive: boolean;
  subjects: AdminCatalogSubject[];
};

export type AdminCatalogPage = {
  items: AdminCatalogLevel[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type AdminCatalogFilters = {
  query: string;
  page: number;
  pageSize: number;
};

function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CR");
}

export async function getAdminContentCatalog(
  catalogQuery: string,
): Promise<AdminCatalogLevel[]> {
  const levels = await prisma.level.findMany({
    orderBy: { levelNumber: "asc" },
    select: {
      id: true,
      levelNumber: true,
      description: true,
      isActive: true,
      subjects: {
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          _count: {
            select: { modules: true },
          },
        },
      },
    },
  });

  const catalog = levels.map((level) => ({
    id: level.id,
    levelNumber: level.levelNumber,
    description: level.description,
    isActive: level.isActive,
    subjects: level.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      description: subject.description,
      isActive: subject.isActive,
      moduleCount: subject._count.modules,
    })),
  }));
  const normalizedQuery = normalizeCatalogText(catalogQuery);

  if (!normalizedQuery) {
    return catalog;
  }

  const numericQuery = /^\d+$/.test(normalizedQuery)
    ? Number(normalizedQuery)
    : null;

  return catalog.flatMap((level) => {
    const levelMatches =
      numericQuery !== null
        ? level.levelNumber === numericQuery
        : normalizeCatalogText(
            `Nivel ${level.levelNumber} ${level.description ?? ""}`,
          ).includes(normalizedQuery);
    const matchingSubjects = levelMatches
      ? level.subjects
      : level.subjects.filter((subject) =>
          normalizeCatalogText(
            `${subject.name} ${subject.description ?? ""}`,
          ).includes(normalizedQuery),
        );

    return levelMatches || matchingSubjects.length > 0
      ? [{ ...level, subjects: matchingSubjects }]
      : [];
  });
}

export async function getAdminContentCatalogPage({
  query,
  page,
  pageSize,
}: AdminCatalogFilters): Promise<AdminCatalogPage> {
  const catalog = await getAdminContentCatalog(query);
  const totalItems = catalog.length;

  return {
    items: catalog.slice((page - 1) * pageSize, page * pageSize),
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
  };
}
