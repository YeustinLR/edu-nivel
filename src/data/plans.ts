import { BookOpen, Shield, Users } from "lucide-react";

import { Plan } from "@/types/plan";

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
    desc: "Herramientas completas para acompañar y evaluar a tus estudiantes.",
    features: [
      "Todo lo del plan Estudiante",
      "Dashboard de seguimiento grupal",
      "Gestión de evaluaciones propias",
      "Reportes individuales descargables",
      "Hasta 40 estudiantes vinculados",
      "Soporte prioritario",
    ],
    cta: "Empezar como docente",
    destacado: true,
  },
  {
    id: "institucion",
    nombre: "Institución",
    icon: Shield,
    mensual: null,
    anual: null,
    color: "emerald",
    desc: "Solución a medida para colegios y escuelas completas.",
    features: [
      "Usuarios ilimitados",
      "Panel de administración centralizado",
      "Gestión de contenidos por nivel",
      "Integración con sistemas institucionales",
      "Capacitación incluida",
      "SLA y soporte dedicado",
    ],
    cta: "Contactar asesor",
    destacado: false,
  },
];
