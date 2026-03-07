import type { PurchasesService } from './PurchasesService';

export class NoOpPurchasesService implements PurchasesService {
  async purchase(): Promise<boolean> {
    return false;
  }
}
