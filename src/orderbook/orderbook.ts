import { Duplex } from 'stream';
import {
  TokenPair,
  OrderbookOrder,
  ApiFeePayload,
  ApiFeeResponse,
  SignedOrder,
  ApiOrderOptions,
} from '../types/0x-spec';

interface Orderbook extends Duplex {
  getTokenPairs(): Promise<Array<TokenPair>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<OrderbookOrder>>;
  getOrder(orderHash: string): Promise<OrderbookOrder | undefined>;
  getFees(feePayload: ApiFeePayload): Promise<ApiFeeResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<boolean>;
}

export { Orderbook };
