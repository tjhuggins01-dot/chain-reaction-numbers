export interface AnalyticsService {
  track(event: string, payload?: Record<string, unknown>): void;
}
