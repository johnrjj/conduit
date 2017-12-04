import { BigNumber } from 'bignumber.js';
import { SignedOrder, Token } from '0x.js';
import { OrderRelevantState } from '../client/types';
import { OrderFilterOptions } from '../../types';

export interface Repository {
  getTokenPairs();
  getOrders(options?: OrderFilterOptions);
  getOrder(orderHash: string);
  updateOrder(orderHash: string, orderState: OrderRelevantState): Promise<SignedOrder>;
  getOrderbookForTokenPair(baseTokenAddress: string, quoteTokenAddress: string);
  addOrder(
    orderHash: string,
    takerTokenRemainingAmount: BigNumber,
    signedOrder: SignedOrder
  ): Promise<SignedOrder>;
  addToken(token: Token): Promise<Token>;
  addTokenPair(baseTokenAddress, quoteTokenAddress);
  getBaseTokenAndQuoteTokenFromMakerAndTaker(
    takerTokenAddress: string,
    makerTokenAddress: string
  ): Promise<{ baseToken: string; quoteToken: string }>;
}
