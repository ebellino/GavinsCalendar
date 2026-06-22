// Next.js runs register() once per server instance start.
// https://nextjs.org/docs/app/guides/instrumentation
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { cleanupPastData } = await import("@/lib/cleanup");
    await cleanupPastData();
  }
}
