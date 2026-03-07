import type { AdsService } from './AdsService';

export class NoOpAdsService implements AdsService {
  async showInterstitial(): Promise<void> {
    return Promise.resolve();
  }
}
