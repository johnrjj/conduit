import { Duplex } from 'stream';
import { SignedOrder, Token } from '0x.js';
import { BigNumber } from 'bignumber.js';
import {
  OrderbookPair,
  TokenPair,
  OrderFilterOptions,
  PaginationOptions,
  FeeQueryRequest,
  FeeQueryResponse,
} from '../../types';

export interface Relay extends Duplex {
  getTokenPairs(o?: PaginationOptions): Promise<Array<TokenPair>>;
  getOrders(options?: OrderFilterOptions): Promise<Array<SignedOrder | null>>;
  getOrder(orderHash: string): Promise<SignedOrder | null>;
  getFees(feePayload: FeeQueryRequest): Promise<FeeQueryResponse>;
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<void>;
  getOrderbook(baseTokenAddress: string, quoteTokenAddress: string): Promise<OrderbookPair>;
  addToken(token: Token): Promise<void>;
  addTokenPair(baseToken: string, quoteToken: string): Promise<void>;
}
