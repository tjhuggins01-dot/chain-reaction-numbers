export interface AdsService {
  showInterstitial(placement: string): Promise<void>;
}
