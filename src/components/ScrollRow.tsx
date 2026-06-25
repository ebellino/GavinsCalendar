"use client";

import { useEffect, useRef } from "react";

// Remaps vertical wheel motion to horizontal scroll while hovering.
// Uses a native listener with { passive: false } so preventDefault() actually
// fires — React's synthetic onWheel is passive and can't stop page scroll.
export function ScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  return (
    <div ref={ref} className="flex gap-3 overflow-x-auto pb-2 min-w-0">
      {children}
    </div>
  );
}
