export interface PersistenceService {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
}
