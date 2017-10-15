import { Duplex } from 'stream';
import { TokenPair, FeeApiRequest, FeeApiResponse, ApiOrderOptions } from '../types/relayer-spec';
import { OrderbookOrder, SignedOrder } from '../types/core';

interface Orderbook extends Duplex {
  getTokenPairs(): Promise<Array<TokenPair>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<OrderbookOrder>>;
  getOrder(orderHash: string): Promise<OrderbookOrder | undefined>;
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<boolean>;
}

export { Orderbook };
