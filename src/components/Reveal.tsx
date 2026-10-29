"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

/**
 * Subtle scroll-in for blocks marked data-reveal.
 * Content is never hidden by CSS: if GSAP or JS fails, everything
 * stays visible. Respects prefers-reduced-motion (no animation).
 */
export default function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Selector is scoped to this component, so two Reveal blocks on a
      // page never animate each other's elements.
      const select = gsap.utils.selector(ref);
      select<HTMLElement>("[data-reveal]").forEach((el, i) => {
        gsap.from(el, {
          delay: Math.min(i, 4) * 0.03,
          duration: 0.5,
          ease: "power2.out",
          opacity: 0,
          scrollTrigger: { once: true, start: "top 92%", trigger: el },
          y: 14,
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
