import { SignedOrder, Token, ZeroEx } from '0x.js';
import { BigNumber } from 'bignumber.js';
import {
  OrderbookPair,
  TokenPair,
  OrderFilterOptions,
  PaginationOptions,
  FeeQueryRequest,
  FeeQueryResponse,
} from '../../types';
import { Repository } from '../repository';
import { Logger } from '../../util/logger';
import { Publisher } from '../publisher/publisher';

// not currently exported by 0x;
export interface OrderRelevantState {
  remainingFillableMakerTokenAmount: BigNumber;
  remainingFillableTakerTokenAmount: BigNumber;
  makerBalance?: BigNumber;
  makerProxyAllowance?: BigNumber;
  makerFeeBalance?: BigNumber;
  makerFeeProxyAllowance?: BigNumber;
  filledTakerTokenAmount?: BigNumber;
  cancelledTakerTokenAmount?: BigNumber;
}

export interface RelayConfiguration {
  repository: Repository;
  zeroEx: ZeroEx;
  publisher: Publisher;
  logger?: Logger;
}

export interface Relay {
  getTokens(): Promise<Array<Token>>;
  getTokenPairs(o?: PaginationOptions): Promise<Array<TokenPair>>;
  getOrders(options?: OrderFilterOptions): Promise<Array<SignedOrder>>;
  getOrder(orderHash: string): Promise<SignedOrder | null>;
  getFees(feePayload: FeeQueryRequest): Promise<FeeQueryResponse>;
  postOrder(signedOrder: SignedOrder): Promise<SignedOrder>;
  getOrderbook(baseTokenAddress: string, quoteTokenAddress: string): Promise<OrderbookPair>;
  addToken(token: Token): Promise<void>;
  addTokenPair(baseToken: string, quoteToken: string): Promise<void>;
  updateOrder(orderHash: string, orderState: OrderRelevantState): Promise<SignedOrder>;
  getBaseTokenAndQuoteTokenFromMakerAndTaker(
    makerTokenAddress: string,
    takerTokenAddress
  ): Promise<{ baseToken: string; quoteToken: string }>;
}
