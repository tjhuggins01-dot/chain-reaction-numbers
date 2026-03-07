export interface RemoteConfigService {
  getBoolean(flag: string, fallback: boolean): boolean;
}
