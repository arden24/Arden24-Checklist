import { type RefObject, useEffect, useRef } from "react";

/** Slide + overlay length; keep in 250–300ms range */
export const MOBILE_DRAWER_TRANSITION_MS = 260;

/** Portaled drawer overlay + panel transform/opacity timing (keep in sync with `MOBILE_DRAWER_TRANSITION_MS`). */
export const drawerMotionClass =
  "duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:duration-0";

/** Focus ring for in-drawer links and the close control. */
export const drawerLinkFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]):not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"])';

export function getVisibleFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0
  );
}

/**
 * Cycles Tab / Shift+Tab within the drawer root (overlay should stay out of tab order).
 */
export function useDrawerFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!(el instanceof HTMLElement)) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const root = containerRef.current;
      if (!(root instanceof HTMLElement)) return;
      const nodes = getVisibleFocusables(root);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const activeEl = document.activeElement;
      const contained = Boolean(activeEl && root.contains(activeEl));

      if (e.shiftKey) {
        if (activeEl === first || !contained) {
          last.focus();
          e.preventDefault();
        }
      } else if (activeEl === last || !contained) {
        first.focus();
        e.preventDefault();
      }
    }

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

/**
 * After the drawer fully unmounts (post close animation), return focus to the menu button.
 */
export function useReturnFocusToTrigger(
  visible: boolean,
  triggerRef: RefObject<HTMLElement | null>
) {
  const prevVisible = useRef(false);

  useEffect(() => {
    const wasVisible = prevVisible.current;
    prevVisible.current = visible;
    if (wasVisible && !visible) {
      const id = window.requestAnimationFrame(() => {
        triggerRef.current?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [visible, triggerRef]);
}
