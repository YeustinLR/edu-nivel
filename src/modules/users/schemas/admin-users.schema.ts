import { z } from "zod";

import { Role } from "@/generated/prisma/enums";

export const ADMIN_USERS_PAGE_SIZE = 10;
export const adminUserVerificationValues = ["verified", "unverified"] as const;
export const adminUserSortValues = ["newest", "oldest", "name"] as const;

export type AdminUserVerification =
  (typeof adminUserVerificationValues)[number];
export type AdminUserSort = (typeof adminUserSortValues)[number];

export type AdminUsersSearchParams = {
  q?: string | string[];
  role?: string | string[];
  verification?: string | string[];
  sort?: string | string[];
  page?: string | string[];
  deleted?: string | string[];
};

const singleString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const queryParameter = z
  .preprocess(singleString, z.string().trim().max(100).optional())
  .catch(undefined);

const roleParameter = z
  .preprocess(singleString, z.nativeEnum(Role).optional())
  .catch(undefined);

const verificationParameter = z
  .preprocess(
    singleString,
    z.enum(adminUserVerificationValues).optional(),
  )
  .catch(undefined);

const sortParameter = z
  .preprocess(singleString, z.enum(adminUserSortValues).optional())
  .catch(undefined);

const pageParameter = z
  .preprocess(
    (value) => {
      const singleValue = singleString(value);
      return singleValue ? Number(singleValue) : 1;
    },
    z.number().int().min(1).max(100_000),
  )
  .catch(1);

export const adminUsersSearchParamsSchema = z.object({
  q: queryParameter,
  role: roleParameter,
  verification: verificationParameter,
  sort: sortParameter,
  page: pageParameter,
});

export type ParsedAdminUsersSearchParams = {
  query: string;
  role?: Role;
  verification?: AdminUserVerification;
  sort: AdminUserSort;
  page: number;
};

export function parseAdminUsersSearchParams(
  searchParams: AdminUsersSearchParams,
): ParsedAdminUsersSearchParams {
  const parsed = adminUsersSearchParamsSchema.parse(searchParams);

  return {
    query: parsed.q ?? "",
    role: parsed.role,
    verification: parsed.verification,
    sort: parsed.sort ?? "newest",
    page: parsed.page,
  };
}

export function buildAdminUsersHref(
  state: ParsedAdminUsersSearchParams,
  page = state.page,
) {
  const params = new URLSearchParams();

  if (state.query) params.set("q", state.query);
  if (state.role) params.set("role", state.role);
  if (state.verification) {
    params.set("verification", state.verification);
  }
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return `/dashboard/admin/users${query ? `?${query}` : ""}`;
}
