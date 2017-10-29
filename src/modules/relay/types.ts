import { Duplex } from 'stream';
import { SignedOrder } from '0x.js';
import { BigNumber } from 'bignumber.js';
import { OrderbookPair } from '../../types';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions, TokenPair } from '../rest-api/types';

// signedorder superset, need more guidance from zeroex about order metadata
export interface SignedOrderWithCurrentBalance extends SignedOrder {
  remainingTakerTokenAmount: BigNumber;
}

export interface RelayDatabase extends Duplex {
  getTokenPairs(page: number, perPage: number): Promise<Array<TokenPair>>;
  getOrders(options?: ApiOrderOptions): Promise<Array<SignedOrder | null>>;
  getOrder(orderHash: string): Promise<SignedOrder | null>;
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<void>;
  getOrderbook(baseTokenAddress: string, quoteTokenAddress: string): Promise<OrderbookPair>;
}
