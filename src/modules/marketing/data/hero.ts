
import { HeroContentData } from "@/modules/marketing/types/hero";

export const heroContentData: HeroContentData = {
    badge: "Plataforma educativa · Costa Rica",
    titleParts: [
        "La plataforma educativa que",
        "primaria y secundaria",
        "estaban esperando"
    ],
    description: "Contenidos organizados por nivel, seguimiento académico para docentes y modelo de suscripción flexible. Alineada al currículo del MEP y  pensada para el contexto educativo costarricense.",
    tags: [
        { label: "Soy estudiante", color: "yellow" },
        { label: "Soy docente", color: "purple" },

    ],
    ctaPrimary: "Empezar 14 días gratis",
    ctaSecondary: "Ver cómo funciona",
    socialProof: {
        users: [
            { initial: "E", bg: "#7c3aed" },
            { initial: "D", bg: "#0d9488" },
            { initial: "A", bg: "#b45309                " },
            { initial: "D", bg: "#1d4ed8" },
        ],
        text: "+ Multiples usuarios en lista de espera",
        note: "Sin tarjeta requerida",
    }
}