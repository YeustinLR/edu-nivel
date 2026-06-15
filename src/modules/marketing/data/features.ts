import { BookOpen, BarChart2 } from "lucide-react";

import type { FeatureItem } from "@/modules/marketing/types/features";

export const featureData: FeatureItem[] = [
  {
    badge: "badge-yellow",
    badgeText: "Estudiantes",
    icon: BookOpen,
    iconColor: "text-accent",
    iconBg: "color-mix(in srgb, var(--accent) 15%, transparent)",
    title: "Aprendé a tu ritmo",
    desc: "Accedé a contenidos de tu nivel (1° a 11°) alineados al MEP. Seguí tu progreso y recibí retroalimentación inmediata en cada evaluación.",
    items: [
      "Contenidos por nivel educativo (Primaria y Secundaria)",
      "Evaluaciones con corrección automática",
      "Progreso visible en tiempo real",
      "Acceso desde cualquier dispositivo",
    ],
    border: "color-mix(in srgb, var(--accent) 15%, transparent)",
  },
  {
    badge: "badge-purple",
    badgeText: "Docentes",
    icon: BarChart2,
    iconColor: "text-secondary",
    iconBg: "color-mix(in srgb, var(--secondary) 15%, transparent)",
    title: "Recursos para la docencia",
    desc: "Docentes suscritos acceden a materiales educativos y planeamientos alineados al MEP. Recursos de gran ayuda para enriquecer tus clases.",
    items: [
      "Materiales educativos por asignatura y nivel",
      "Planeamientos alineados al MEP y Faro",
      "Banco de recursos para la práctica docente",
      "Acceso desde cualquier dispositivo",
    ],
    border: "color-mix(in srgb, var(--secondary) 15%, transparent)",
  },
];
