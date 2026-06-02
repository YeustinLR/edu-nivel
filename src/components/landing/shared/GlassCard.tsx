import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = "" }: Props) {
  return <div className={`glass-card rounded-2xl ${className}`}>{children}</div>;
}
