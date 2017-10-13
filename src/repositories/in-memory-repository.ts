import * as BigNumber from 'bignumber.js';
import { Duplex } from 'stream';
import { Repository } from './repository';
import {
  TokenPair,
  OrderbookOrder,
  OrderState,
  ApiFeePayload,
  ApiFeeResponse,
  SignedOrder,
  ApiOrderOptions,
  OrderHash,
} from '../types/0x-spec';
import { BlockchainLogEvent, OrderFillMessage } from '../types/core';
import { Logger } from '../util/logger';

export interface InMemoryDatabase {
  orderbook: Map<OrderHash, OrderbookOrder>;
}

export class InMemoryRepository extends Duplex implements Repository {
  private db: InMemoryDatabase;
  private logger: Logger;

  constructor({
    initialDb,
    logger,
  }: {
    logger: Logger;
    initialDb?: InMemoryDatabase;
  }) {
    super({ objectMode: true, highWaterMark: 1024 });
    this.logger = logger;
    this.db = {
      orderbook: new Map(),
      ...initialDb,
    };
  }

  getOrderbook(): Map<string, OrderbookOrder> {
    return this.db.orderbook;
  }

  updateOrderbook(orderHash: string, updatedOrder: OrderbookOrder): boolean {
    this.db.orderbook.set(orderHash, updatedOrder);
    return true;
  }

  private orderbookToArray() {
    return Array.from(this.db.orderbook.values());
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }

  private handleOrderFillMessage(msg: OrderFillMessage) {
    const { orderHash, filledMakerTokenAmount, filledTakerTokenAmount } = msg;
    this.log(
      'debug',
      `Order ${orderHash} details: 
      FilledMakerAmount: ${filledMakerTokenAmount.toString()}
      FilledTakerAmount: ${filledTakerTokenAmount.toString()}`
    );

    const existingOrder = this.getOrderbook().get(orderHash);

    if (!existingOrder) {
      this.log(
        'debug',
        `Order ${orderHash} from OrderFillMessage does not exist in our orderbook, skipping`
      );
      return;
    }

    const previousRemainingTakerTokenAmount =
      existingOrder.remainingTakerTokenAmount;
    const newRemainingTakerTokenAmount = previousRemainingTakerTokenAmount.sub(
      filledTakerTokenAmount as BigNumber.BigNumber
    );
    const updatedOrder: OrderbookOrder = {
      ...existingOrder,
      remainingTakerTokenAmount: newRemainingTakerTokenAmount,
    };
    this.updateOrderbook(orderHash, updatedOrder);

    this.emit('Repo.UpdatedOrder', updatedOrder);
  }

  // noop
  _read() {}

  _write(msg, encoding, callback) {
    // push downstream
    this.push(msg);

    this.log('debug', 'InMemoryRepo received a message');
    this.log('debug', msg);

    switch (msg.type) {
      case 'Blockchain.LogFill':
        const blockchainLog = msg as BlockchainLogEvent;
        this.handleOrderFillMessage(blockchainLog.args as OrderFillMessage);
        break;
      default:
        this.emit('Repo.Unrecgnized', msg);
        break;
    }
    callback();
  }

  async postOrder(
    orderHash: OrderHash,
    signedOrder: SignedOrder
  ): Promise<boolean> {
    // missing pending field but i'm not sure what to do with that? docs are sparse
    const fullOrder: OrderbookOrder = {
      signedOrder,
      state: OrderState.OPEN,
      remainingTakerTokenAmount: signedOrder.makerTokenAmount,
    };
    this.db.orderbook.set(orderHash, fullOrder);
    return true;
  }

  async getOrders(
    options?: ApiOrderOptions | undefined
  ): Promise<OrderbookOrder[]> {
    const orders = this.orderbookToArray().filter(
      x => x.state === OrderState.OPEN
    );
    return orders;
  }

  getTokenPairs(): Promise<TokenPair[]> {
    throw new Error('Method not implemented.');
  }

  async getOrder(orderHash: string): Promise<OrderbookOrder | undefined> {
    return this.db.orderbook.get(orderHash);
  }

  getFees(feePayload: ApiFeePayload): Promise<ApiFeeResponse> {
    throw new Error('Method not implemented.');
  }
}
