import type { ReplayLog } from '../core/ReplayLog';
import type { PersistenceService } from '../platform/PersistenceService';

export class SaveService {
  constructor(private readonly persistence: PersistenceService) {}

  async saveReplay(log: ReplayLog): Promise<void> {
    await this.persistence.save('chain-reaction-replay', JSON.stringify(log));
  }

  async loadReplay(): Promise<ReplayLog | null> {
    const data = await this.persistence.load('chain-reaction-replay');
    return data ? (JSON.parse(data) as ReplayLog) : null;
  }
}
