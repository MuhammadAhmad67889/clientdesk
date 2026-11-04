/** Health status: ok when the database answers, degraded when it does
 * not. The route reports degraded instead of crashing, so monitoring
 * sees a 503 it can alert on rather than a failed deploy. */
export interface HealthStatus {
  database: "down" | "up";
  status: "degraded" | "ok";
}

export async function checkHealth(ping: () => Promise<unknown>): Promise<HealthStatus> {
  try {
    await ping();
    return { database: "up", status: "ok" };
  } catch {
    return { database: "down", status: "degraded" };
  }
}
