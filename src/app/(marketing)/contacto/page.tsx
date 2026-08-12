import type { Metadata } from "next";

import ContactSection from "@/modules/marketing/components/contact/ContactSection";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Comunicate con el equipo de EduNivel para resolver tus dudas sobre la plataforma, los planes o el contenido educativo.",
};

export default function ContactPage() {
  return <ContactSection />;
}
