export class DemoUsageBudget {
  private resetAt = 0;
  private attempts = 0;

  constructor(
    private readonly limit: number,
    private readonly windowSeconds: number,
  ) {}

  take(): number | null {
    const now = Date.now();
    if (now >= this.resetAt) {
      this.resetAt = now + this.windowSeconds * 1000;
      this.attempts = 0;
    }
    if (this.attempts >= this.limit) return Math.ceil((this.resetAt - now) / 1000);
    this.attempts += 1;
    return null;
  }
}
