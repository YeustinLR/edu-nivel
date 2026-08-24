export type LessonStatus = "done" | "current" | "locked";
export type LessonType = "lesson" | "video" | "activity" | "pdf" | "quiz";
export type DayStatus = "done" | "today" | "pending";

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  durationLabel: string;
  status: LessonStatus;
}

export interface CourseModule {
  id: string;
  order: number;
  name: string;
  completedCount: number;
  totalCount: number;
  lessons: readonly Lesson[];
}

export interface CourseTab {
  id: string;
  label: string;
  modules: readonly CourseModule[];
}

export interface WeeklyDay {
  id: string;
  label: string;
  status: DayStatus;
}

export interface LessonExample {
  id: string;
  expression: string;
  hint: string;
}

export interface LessonRule {
  id: string;
  emphasis: string;
  text: string;
}

export interface NumberLineVisual {
  eyebrow: string;
  accessibleLabel: string;
  equation: string;
  firstJumpLabel: string;
  secondJumpLabel: string;
}

export interface LessonContent {
  sectionTitle: string;
  introduction: string;
  rules: readonly LessonRule[];
  examplesTitle: string;
  examples: readonly LessonExample[];
  visual: NumberLineVisual;
  calloutTitle: string;
  calloutItems: readonly string[];
}

export interface LessonNavigationItem {
  label: string;
  href: string;
}
