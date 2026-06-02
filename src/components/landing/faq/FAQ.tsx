"use client";

import { faqs } from "@/data/faqs";

import { useFAQ } from "@/hooks/useFAQ";

import FAQItem from "./FAQItem";
import SectionTitle from "../shared/SectionTitle";

export default function FAQ() {
  const { open, toggle } = useFAQ();

  return (
    <section className="py-24 px-5 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <SectionTitle
          badge="Preguntas frecuentes"
          title="Resolvemos tus dudas"
        />

        <div className="glass-card rounded-3xl overflow-hidden">
          {faqs.map((faq, index) => (
            <FAQItem
              key={faq.q}
              item={faq}
              isOpen={open === index}
              onClick={() => toggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}