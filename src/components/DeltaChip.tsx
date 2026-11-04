import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Delta } from "../lib/analytics";

/** One delta chip, shared by the dashboard and analytics pages, so
 * the same change never renders two different ways. */
export default function DeltaChip({ delta }: { delta: Delta }) {
  return (
    <small className={`delta delta-${delta.direction}`}>
      {delta.direction === "up" && <TrendingUp aria-hidden="true" className="icon-inline" size={14} />}
      {delta.direction === "down" && <TrendingDown aria-hidden="true" className="icon-inline" size={14} />}
      {delta.direction === "flat" && <Minus aria-hidden="true" className="icon-inline" size={14} />}
      {delta.label}
    </small>
  );
}
