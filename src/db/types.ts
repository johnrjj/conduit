import { Duplex } from 'stream';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions, TokenPair } from '../rest-api/types';
import { OrderbookOrder, OrderbookPair, SignedOrder } from '../types/core';

interface RelayDatabase extends Duplex {
  getTokenPairs(page: number, perPage: number): Promise<Array<TokenPair>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<SignedOrder | null>>;
  getOrder(orderHash: string): Promise<SignedOrder | null>;
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<void>;
  getOrderbook(baseTokenAddress: string, quoteTokenAddress: string): Promise<OrderbookPair>;
}

export { RelayDatabase };
