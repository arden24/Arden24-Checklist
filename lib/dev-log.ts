/** Logs only in development — keeps production consoles quiet and avoids leaking debug detail. */
export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console -- intentional dev-only logging
    console.log(...args);
  }
}
