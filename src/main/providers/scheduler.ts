export type PollOutcome = 'ok' | 'backoff'

export interface PollSchedulerOptions {
  intervalMs: number
  /** Upper bound for the doubling backoff after `backoff` outcomes. */
  maxBackoffMs: number
}

/**
 * Runs a task on a fixed interval and doubles the delay while the task asks
 * for backoff (rate limits, repeated network failures). Only one run is in
 * flight at a time; `triggerNow` restarts the cycle immediately.
 */
export class PollScheduler {
  private timer: NodeJS.Timeout | null = null
  private running = false
  private currentDelay: number
  private stopped = true

  constructor(
    private readonly task: () => Promise<PollOutcome>,
    private options: PollSchedulerOptions
  ) {
    this.currentDelay = options.intervalMs
  }

  start(): void {
    this.stopped = false
    void this.runAndSchedule()
  }

  stop(): void {
    this.stopped = true
    this.clearTimer()
  }

  setInterval(intervalMs: number): void {
    this.options = { ...this.options, intervalMs }
    this.currentDelay = intervalMs
    if (!this.stopped) this.schedule()
  }

  async triggerNow(): Promise<void> {
    this.clearTimer()
    await this.runAndSchedule()
  }

  private async runAndSchedule(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const outcome = await this.task()
      this.currentDelay =
        outcome === 'ok'
          ? this.options.intervalMs
          : Math.min(this.currentDelay * 2, this.options.maxBackoffMs)
    } catch {
      this.currentDelay = Math.min(this.currentDelay * 2, this.options.maxBackoffMs)
    } finally {
      this.running = false
    }
    if (!this.stopped) this.schedule()
  }

  private schedule(): void {
    this.clearTimer()
    this.timer = setTimeout(() => void this.runAndSchedule(), this.currentDelay)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
