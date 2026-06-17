import { ChevronDown } from "lucide-react";

import type { FAQItem } from "@/modules/marketing/types/faq";

interface Props {
  item: FAQItem;
  isOpen: boolean;
  onClick: () => void;
}

export default function FAQItem({ item, isOpen, onClick }: Props) {
  return (
    <div className="faq-item">
      <button
        onClick={onClick}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 cursor-pointer bg-transparent border-0 text-foreground text-small font-semibold"
      >
        <span>{item.q}</span>
        <ChevronDown
          size={16}
          className="shrink-0 text-slate-500"
          style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {isOpen && (
        <div className="px-6 pb-5 text-muted fadein text-small" style={{ lineHeight: 1.75 }}>
          {item.a}
        </div>
      )}
    </div>
  );
}
