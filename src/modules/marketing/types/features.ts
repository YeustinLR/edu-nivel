import { type LucideIcon } from "lucide-react";

export interface FeatureItem {
  badge: string;
  badgeText: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
  items: string[];
  border: string;
}
