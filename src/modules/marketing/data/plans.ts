import { BookOpen, Users } from "lucide-react";

import { Plan } from "@/modules/marketing/types/plan";
import {
  amountMinorToCRC,
  SUBSCRIPTION_PLAN_CATALOG,
} from "@/modules/subscriptions/config/plan-catalog";

export const plans: Plan[] = [
  {
    id: "estudiante",
    registrationRole: "STUDENT",
    monthlyPlanCode: "STUDENT_MONTHLY",
    annualPlanCode: "STUDENT_YEARLY",
    nombre: "Estudiante",
    icon: BookOpen,
    mensual: amountMinorToCRC(
      SUBSCRIPTION_PLAN_CATALOG.STUDENT_MONTHLY.amountMinor,
    ),
    anual: amountMinorToCRC(
      SUBSCRIPTION_PLAN_CATALOG.STUDENT_YEARLY.amountMinor,
    ),
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
    registrationRole: "TEACHER",
    monthlyPlanCode: "TEACHER_MONTHLY",
    annualPlanCode: "TEACHER_YEARLY",
    nombre: "Docente",
    icon: Users,
    mensual: amountMinorToCRC(
      SUBSCRIPTION_PLAN_CATALOG.TEACHER_MONTHLY.amountMinor,
    ),
    anual: amountMinorToCRC(
      SUBSCRIPTION_PLAN_CATALOG.TEACHER_YEARLY.amountMinor,
    ),
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
