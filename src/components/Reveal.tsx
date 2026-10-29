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
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el, i) => {
        gsap.from(el, {
          duration: 0.5,
          ease: "power2.out",
          opacity: 0,
          scrollTrigger: { once: true, start: "top 92%", trigger: el },
          stagger: 0.06,
          y: 14,
          // Keep per-element delay small; stagger above is per-batch only when
          // elements share a trigger, so also offset by index within a group.
          delay: Math.min(i, 4) * 0.03,
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
