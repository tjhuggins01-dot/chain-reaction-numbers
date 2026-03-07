import type { PersistenceService } from './PersistenceService';

export class LocalPersistenceService implements PersistenceService {
  async save(key: string, data: string): Promise<void> {
    localStorage.setItem(key, data);
  }

  async load(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }
}
