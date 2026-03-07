import type { RemoteConfigService } from './RemoteConfigService';

export class NoOpRemoteConfigService implements RemoteConfigService {
  getBoolean(_flag: string, fallback: boolean): boolean {
    return fallback;
  }
}
