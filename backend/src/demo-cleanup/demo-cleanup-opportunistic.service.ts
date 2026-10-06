import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { DemoCleanupService } from './demo-cleanup.service.js';

export const DEMO_OPPORTUNISTIC_CLEANUP_DELAY_MS = 10_000;
export const DEMO_OPPORTUNISTIC_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class DemoCleanupOpportunisticService implements OnModuleDestroy {
  private readonly logger = new Logger(DemoCleanupOpportunisticService.name);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private stopped = false;
  private lastAttemptAt: number | undefined;

  constructor(private readonly cleanup: DemoCleanupService) {}

  requestCleanup(): void {
    if (this.stopped || this.timer || this.running) return;
    if (
      this.lastAttemptAt !== undefined &&
      Date.now() - this.lastAttemptAt < DEMO_OPPORTUNISTIC_CLEANUP_INTERVAL_MS
    )
      return;

    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.attemptCleanup();
    }, DEMO_OPPORTUNISTIC_CLEANUP_DELAY_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private async attemptCleanup(): Promise<void> {
    this.running = true;
    // Every actual attempt consumes the hour, including contention and failures.
    // This clock is only for throttle; PostgreSQL owns deletion eligibility.
    this.lastAttemptAt = Date.now();
    try {
      const result = await this.cleanup.cleanupOneBatchIfAvailable();
      if (result.status === 'completed' && result.environmentsDeleted > 0) {
        this.logger.log(
          `Opportunistic DEMO cleanup completed: ${result.environmentsDeleted} environments removed.`,
        );
      }
    } catch {
      this.logger.error('Opportunistic DEMO cleanup failed.');
    } finally {
      this.running = false;
    }
  }
}
