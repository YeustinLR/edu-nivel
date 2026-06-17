import type { LucideIcon } from "lucide-react";

export interface Plan {
  id: string;
  nombre: string;
  icon: LucideIcon;
  mensual: number | null;
  anual: number | null;
  color: string;
  desc: string;
  features: string[];
  cta: string;
  destacado: boolean;
}