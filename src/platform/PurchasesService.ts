export interface PurchasesService {
  purchase(productId: string): Promise<boolean>;
}
