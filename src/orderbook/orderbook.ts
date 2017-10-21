import { Duplex } from 'stream';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions, TokenPair } from '../rest-api/types';
import { OrderbookOrder, SignedOrder } from '../types/core';

interface Orderbook extends Duplex {
  getTokenPairs(): Promise<Array<TokenPair>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<SignedOrder>>;
  getOrder(orderHash: string): Promise<SignedOrder>;
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<boolean>;
}

export { Orderbook };
