"use client";

import { useRef, type WheelEvent } from "react";

// A plain overflow-x-auto row only scrolls sideways via its scrollbar or a
// trackpad swipe - a mouse wheel does nothing. This remaps vertical wheel
// motion to horizontal scroll while hovering, but only when the gesture is
// mostly vertical, so an actual trackpad horizontal swipe still passes
// through untouched instead of being double-handled.
export function ScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const el = ref.current;
    if (!el) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  }

  return (
    <div ref={ref} onWheel={handleWheel} className="flex gap-3 overflow-x-auto pb-2 min-w-0">
      {children}
    </div>
  );
}
