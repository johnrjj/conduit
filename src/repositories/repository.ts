import {
  TokenPair,
  OrderbookOrder,
  ApiFeePayload,
  ApiFeeResponse,
  SignedOrder,
  ApiOrderOptions,
} from '../types/0x-spec';

interface Repository {
  getTokenPairs(): Promise<Array<TokenPair>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<OrderbookOrder>>;
  getOrder(orderHash: string): Promise<OrderbookOrder>;
  getFees(feePayload: ApiFeePayload): Promise<ApiFeeResponse>;
  postOrder(signedOrder: SignedOrder): Promise<boolean>;
}

export { Repository };
