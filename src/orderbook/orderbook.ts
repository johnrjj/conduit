import { Duplex } from 'stream';
import {
  TokenPair,
  OrderbookOrder,
  FeeApiRequest,
  FeeApiResponse,
  SignedOrder,
  ApiOrderOptions,
} from '../types/0x-spec';

interface Orderbook extends Duplex {
  getTokenPairs(): Promise<Array<TokenPair>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<OrderbookOrder>>;
  getOrder(orderHash: string): Promise<OrderbookOrder | undefined>;
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<boolean>;
}

export { Orderbook };
