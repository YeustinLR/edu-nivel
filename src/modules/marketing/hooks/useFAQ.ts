"use client";

import { useState } from "react";

export function useFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpen(open === index ? null : index);
  };

  return {
    open,
    toggle,
  };
}