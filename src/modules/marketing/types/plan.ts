import type { LucideIcon } from "lucide-react";
import type { RegistrationRole } from "@/modules/auth/lib/registration-role";
import type { SubscriptionPlanCode } from "@/modules/subscriptions/config/plan-catalog";

export interface Plan {
  id: string;
  registrationRole: RegistrationRole;
  monthlyPlanCode: SubscriptionPlanCode;
  annualPlanCode: SubscriptionPlanCode;
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
