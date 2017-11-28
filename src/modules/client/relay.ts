import { BigNumber } from 'bignumber.js';
import { Duplex } from 'stream';
import { Pool } from 'pg';
import { SQL } from 'sql-template-strings';
import { ZeroEx, SignedOrder, Token } from '0x.js';
import { RedisClient } from 'redis';
// import { Relay } from './types';
import { Publisher } from './publisher/publisher';
import { Repository } from './repository/postgres';
import { Relay, RelayConfiguration, OrderRelevantState } from './types';

import {
  OrderbookPair,
  ZeroExOrderFillEvent,
  ZeroExOrderCancelEvent,
  TokenPair,
  OrderFilterOptions,
  SerializedSignedOrderWithCurrentBalance,
  SignedOrderWithCurrentBalance,
  FeeQueryRequest,
  FeeQueryResponse,
} from '../../types';
import { serializeSignedOrder } from '../../util/order';
import { Logger } from '../../util/logger';




export class ConduitRelay implements Relay {
  private repository: Repository;
  private zeroEx: ZeroEx;
  private logger?: Logger;
  private publisher?: Publisher;

  constructor({
    zeroEx,
    publisher,
    repository,
    logger,
  }: RelayConfiguration) {
    this.zeroEx = zeroEx;
    this.repository = repository;
    this.publisher = publisher;
    this.logger = logger;
  }

  async getTokenPairs(): Promise<Array<TokenPair>> {
    return this.repository.getTokenPairs();
  }

  async getOrders(options?: OrderFilterOptions): Promise<SignedOrder[]> {
    return this.repository.getOrders(options);
  }

  async getOrder(orderHash: string): Promise<SignedOrder | null> {
    return this.repository.getOrder(orderHash);
  }

  async updateOrder(orderHash: string, orderState: OrderRelevantState): Promise<SignedOrder> {
    return this.repository.updateOrder(orderHash, orderState);
  }

  async getOrderbook(baseTokenAddress, quoteTokenAddress): Promise<OrderbookPair> {
    return this.repository.getOrderbookForTokenPair(baseTokenAddress, quoteTokenAddress);
  }

  async getFees(feePayload: FeeQueryRequest): Promise<FeeQueryResponse> {
    const freeFee: FeeQueryResponse = {
      feeRecipient: '0x0000000000000000000000000000000000000000',
      makerFee: '0',
      takerFee: '0',
    };
    return freeFee;
  }

  async postOrder(orderHash: string, signedOrder: SignedOrder): Promise<SignedOrder> {
    const takerTokenRemainingAmount = await this.getRemainingTakerAmount(
      orderHash,
      signedOrder.takerTokenAmount
    );
    return this.repository.addOrder(orderHash, takerTokenRemainingAmount, signedOrder);
  }

  async addTokenPair(baseTokenAddress, quoteTokenAddress) {
    return this.repository.addTokenPair(baseTokenAddress, quoteTokenAddress);
  }

  async addToken(token: Token) {
    return this.repository.addToken(token);
  }

  async getBaseTokenAndQuoteTokenFromMakerAndTaker(
    takerTokenAddress,
    makerTokenAddress
  ): Promise<{ baseToken: string; quoteToken: string }> {
    return this.repository.getBaseTokenAndQuoteTokenFromMakerAndTaker(takerTokenAddress, makerTokenAddress);
  }

  private async handleOrderFillMessage(fillMessage: ZeroExOrderFillEvent) {

    // const { orderHash, filledMakerTokenAmount, filledTakerTokenAmount } = fillMessage;
    // this.log(
    //   'debug',
    //   `Order ${orderHash} details:
    //   FilledMakerAmount: ${filledMakerTokenAmount.toString()}
    //   FilledTakerAmount: ${filledTakerTokenAmount.toString()}`
    // );

    // const existingOrder = await this.getFullOrder(orderHash);
    // if (!existingOrder) {
    //   this.log(
    //     'debug',
    //     `Order ${orderHash} from OrderFillMessage does not exist in our orderbook, skipping`
    //   );
    //   return;
    // }

    // this.log('info', `Updating order ${orderHash} in orderbook - got a fill event`);
    // const takerTokenAmountRemaining = await this.getRemainingTakerAmount(
    //   orderHash,
    //   existingOrder.takerTokenAmount
    // );
    // this.log(
    //   'debug',
    //   `Order ${orderHash} has ${takerTokenAmountRemaining.toString()} remaining to fill`
    // );

    // this.updateRemainingTakerTokenAmountForOrderInDatabase(orderHash, filledTakerTokenAmount);
    // this.log(
    //   'info',
    //   `Updated ${
    //     orderHash
    //   } in postgres database. Updated Taker Token Amount to ${takerTokenAmountRemaining.toString()}`
    // );
    // const updatedOrder: SignedOrderWithCurrentBalance = {
    //   ...existingOrder,
    //   takerTokenAmountRemaining,
    // };

    // const { baseToken, quoteToken } = await this.getBaseTokenAndQuoteTokenFromMakerAndTaker(
    //   updatedOrder.takerTokenAddress,
    //   updatedOrder.makerTokenAddress
    // );

    // try {
    //   const channel = 'orderbook';
    //   const type = 'fill';
    //   const payload: OrderbookFill = {
    //     ...serializeSignedOrder(updatedOrder),
    //     takerTokenAmountRemaining: takerTokenAmountRemaining.toString(),
    //     filledMakerTokenAmount: filledMakerTokenAmount.toString(),
    //     filledTakerTokenAmount: filledTakerTokenAmount.toString(),
    //   };
    //   const channelHash = `${channel}.${type}:${baseToken}:${quoteToken}`;
    //   const event: Message<OrderbookFill> = {
    //     channel,
    //     type,
    //     payload,
    //   };
    //   // this.publishMessage(channelHash, event);
    // } catch (err) {
    //   this.log('error', 'Error publishing event to redis', err);
    // }
  }

  private async getRemainingTakerAmount(
    orderHash: string,
    originalTakerTokenAmount: BigNumber
  ): Promise<BigNumber> {
    const takerAmountUnavailable = await this.zeroEx.exchange.getUnavailableTakerAmountAsync(
      orderHash
    );
    const takerAmountRemaining = originalTakerTokenAmount.sub(
      new BigNumber(takerAmountUnavailable)
    );
    return takerAmountRemaining;
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}