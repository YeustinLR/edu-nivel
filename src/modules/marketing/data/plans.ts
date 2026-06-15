import { BookOpen, Users } from "lucide-react";

import { Plan } from "@/modules/marketing/types/plan";

export const plans: Plan[] = [
  {
    id: "estudiante",
    nombre: "Estudiante",
    icon: BookOpen,
    mensual: 3500,
    anual: 33600,
    color: "yellow",
    desc: "Acceso completo a contenidos de tu nivel educativo.",
    features: [
      "Contenidos de primaria o secundaria",
      "Ejercicios interactivos por unidad",
      "Seguimiento de progreso personal",
      "Evaluaciones con corrección automática",
      "Soporte por correo electrónico",
    ],
    cta: "Comenzar ahora",
    destacado: false,
  },
  {
    id: "docente",
    nombre: "Docente",
    icon: Users,
    mensual: 6500,
    anual: 62400,
    color: "purple",
    desc: "Acceso a materiales educativos, pruebas y planeamientos alineados al MEP.",
    features: [
      "Materiales educativos por nivel y materia",
      "Pruebas y evaluaciones alineadas al MEP",
      "Planeamientos didácticos descargables",
      "Soporte prioritario",
    ],
    cta: "Empezar como docente",
    destacado: true,
  },
];
