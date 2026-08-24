import type {
  LessonContent,
  WeeklyDay,
} from "@/components/materias/types";

const integerLessons = [
  { id: "intro", title: "Introducción a los enteros", type: "lesson", durationLabel: "Lección · 3 min", status: "done" },
  { id: "video", title: "Video explicativo", type: "video", durationLabel: "Video · 7 min", status: "done" },
  { id: "operations", title: "Operaciones con números enteros", type: "lesson", durationLabel: "Lección · 8 min", status: "current" },
  { id: "practice", title: "Ejercicios prácticos", type: "activity", durationLabel: "Actividad · 10 min", status: "locked" },
  { id: "summary", title: "Resumen en PDF", type: "pdf", durationLabel: "PDF · 2 páginas", status: "locked" },
  { id: "quiz", title: "Quiz: Números enteros", type: "quiz", durationLabel: "Quiz · 6 preguntas", status: "locked" },
] as const;

const fractionLessons = [
  { id: "fraction-intro", title: "¿Qué es una fracción?", type: "lesson", durationLabel: "Lección · 5 min", status: "done" },
  { id: "fraction-types", title: "Tipos de fracciones", type: "video", durationLabel: "Video · 6 min", status: "current" },
  { id: "fraction-equivalent", title: "Fracciones equivalentes", type: "activity", durationLabel: "Actividad · 8 min", status: "locked" },
  { id: "fraction-add", title: "Suma y resta", type: "lesson", durationLabel: "Lección · 10 min", status: "locked" },
  { id: "fraction-guide", title: "Guía visual", type: "pdf", durationLabel: "PDF · 3 páginas", status: "locked" },
  { id: "fraction-quiz", title: "Quiz: Fracciones", type: "quiz", durationLabel: "Quiz · 6 preguntas", status: "locked" },
] as const;

const geometryLessons = [
  { id: "geometry-intro", title: "Figuras geométricas", type: "lesson", durationLabel: "Lección · 5 min", status: "current" },
  { id: "geometry-lines", title: "Rectas y ángulos", type: "video", durationLabel: "Video · 7 min", status: "locked" },
  { id: "geometry-perimeter", title: "Perímetro", type: "activity", durationLabel: "Actividad · 10 min", status: "locked" },
  { id: "geometry-area", title: "Área", type: "lesson", durationLabel: "Lección · 9 min", status: "locked" },
  { id: "geometry-sheet", title: "Formulario", type: "pdf", durationLabel: "PDF · 2 páginas", status: "locked" },
  { id: "geometry-quiz", title: "Quiz: Geometría", type: "quiz", durationLabel: "Quiz · 6 preguntas", status: "locked" },
] as const;

const allModules = [
  { id: "integers", order: 1, name: "Números enteros", completedCount: 4, totalCount: 6, lessons: integerLessons },
  { id: "fractions", order: 2, name: "Fracciones", completedCount: 1, totalCount: 6, lessons: fractionLessons },
  { id: "geometry", order: 3, name: "Geometría básica", completedCount: 0, totalCount: 6, lessons: geometryLessons },
] as const;

export const courseModules = allModules;

export const weeklyDays: readonly WeeklyDay[] = [
  { id: "mon", label: "Lunes completado", status: "done" },
  { id: "tue", label: "Martes completado", status: "done" },
  { id: "wed", label: "Miércoles completado", status: "done" },
  { id: "thu", label: "Jueves, día actual", status: "today" },
  { id: "fri", label: "Viernes pendiente", status: "pending" },
  { id: "sat", label: "Sábado pendiente", status: "pending" },
  { id: "sun", label: "Domingo pendiente", status: "pending" },
];

export const lessonContent: LessonContent = {
  sectionTitle: "Suma y resta de números enteros",
  introduction: "Para sumar o restar números enteros, seguimos reglas simples basadas en los signos. Recuerda que los números enteros incluyen los positivos, los negativos y el cero.",
  rules: [
    { id: "same", emphasis: "Si los signos son iguales,", text: "se suman los valores absolutos y se conserva el signo." },
    { id: "different", emphasis: "Si los signos son diferentes,", text: "se restan los valores absolutos y se conserva el signo del número con mayor valor absoluto." },
  ],
  examplesTitle: "Ejemplos",
  examples: [
    { id: "example-1", expression: "(+7) + (+3) = +10", hint: "mismo signo, se suman" },
    { id: "example-2", expression: "(-6) + (-2) = -8", hint: "mismo signo, se suman" },
    { id: "example-3", expression: "(+8) + (-5) = +3", hint: "signo diferente, se restan" },
    { id: "example-4", expression: "(-4) - (-7) = +3", hint: "equivale a -4 + 7" },
  ],
  visual: {
    eyebrow: "Ejemplo visual",
    accessibleLabel: "Recta numérica que representa más tres más menos cinco, igual a menos dos",
    equation: "(+3) + (-5) = -2",
    firstJumpLabel: "−5",
    secondJumpLabel: "+3",
  },
  calloutTitle: "Ideas clave",
  calloutItems: [
    "El valor absoluto es la distancia de un número al cero, sin importar su signo.",
    "Practica con la recta numérica para visualizar mejor las operaciones.",
  ],
};
