import type { AnalyticsService } from './AnalyticsService';

export class NoOpAnalyticsService implements AnalyticsService {
  track(): void {
    // no-op
  }
}
