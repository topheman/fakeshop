"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function ScrollTo() {
  const searchParams = useSearchParams();
  const id = searchParams.get("scrollTo");
  useEffect(() => {
    if (id) {
      const element = document.getElementById(id);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  }, [id]);

  return null;
}
