import { Duplex } from 'stream';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions } from '../rest-api/types';
import { OrderbookOrder, SignedOrder } from '../types/core';

interface Orderbook extends Duplex {
  getTokenPairs(): Promise<Array<Array<string>>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<OrderbookOrder>>;
  getOrder(orderHash: string): Promise<OrderbookOrder | undefined>;
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<boolean>;
}

export { Orderbook };
