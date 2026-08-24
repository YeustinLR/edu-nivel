export const studentExploreNavigateEvent = "edunivel:student-explore-navigate";

export type StudentExploreNavigateDetail = {
  href: string;
};

export function isStudentExploreHref(href: string) {
  return href.startsWith("/dashboard/student/explore?");
}
