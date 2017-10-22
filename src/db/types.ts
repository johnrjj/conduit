import { Duplex } from 'stream';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions, TokenPair } from '../rest-api/types';
import { OrderbookOrder, SignedOrder } from '../types/core';

interface RelayDatabase {
  getTokenPairs(): Promise<Array<TokenPair>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<SignedOrder | null>>;
  getOrder(orderHash: string): Promise<SignedOrder | null>;
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<void>;
}

export { RelayDatabase };
