"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

/**
 * Scroll-triggered card motion for everything inside it. Any card,
 * stat tile, auth box, or element marked data-reveal rises slightly,
 * fades in, and settles — staggered a touch when several sit together.
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
      // One selector covers every card-like element; an element that
      // matches twice (a card also marked data-reveal) is still only
      // returned once, so it never gets two animations.
      const select = gsap.utils.selector(ref);
      select<HTMLElement>(".card, .stat, .auth-box, .preview-card, [data-reveal]").forEach((el, i) => {
        gsap.from(el, {
          delay: Math.min(i, 4) * 0.03,
          duration: 0.5,
          ease: "power2.out",
          opacity: 0,
          scale: 0.98,
          scrollTrigger: { once: true, start: "top 92%", trigger: el },
          y: 14,
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
