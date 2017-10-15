import * as BigNumber from 'bignumber.js';
import { Duplex } from 'stream';
import { writeFileSync } from 'fs';
import { ZeroEx } from '0x.js';
import { Orderbook } from './orderbook';
import {
  TokenPair,
  OrderbookOrder,
  OrderState,
  FeeApiRequest,
  FeeApiResponse,
  SignedOrder,
  ApiOrderOptions,
  OrderHash,
} from '../types/0x-spec';
import { BlockchainLogEvent, OrderFillMessage } from '../types/core';
import { Logger } from '../util/logger';

export interface InMemoryDatabase {
  orderbook: Map<OrderHash, OrderbookOrder>;
}

// todo:refactor - most of this can go in orderbook base class
export class InMemoryOrderbook extends Duplex implements Orderbook {
  private db: InMemoryDatabase;
  private zeroEx: ZeroEx;
  private logger: Logger;

  constructor({
    zeroEx,
    initialDb,
    logger,
  }: {
    zeroEx: ZeroEx;
    logger: Logger;
    initialDb?: InMemoryDatabase;
  }) {
    super({ objectMode: true, highWaterMark: 1024 });
    this.zeroEx = zeroEx;
    this.logger = logger;
    this.db = {
      orderbook: new Map(),
      ...initialDb,
    };
  }

  getOrderbook(): Map<string, OrderbookOrder> {
    return this.db.orderbook;
  }

  async postOrder(orderHash: OrderHash, signedOrder: SignedOrder): Promise<boolean> {
    if (this.getOrder(orderHash)) {
      this.log(
        'info',
        `Order ${orderHash} already exists in orderbook, ignoring order post request`
      );
      false;
    }
    const takerAmountRemaining = await this.getRemainingTakerAmount(orderHash, signedOrder);
    this.logger.log(
      'debug',
      `New Order ${orderHash} has ${takerAmountRemaining.toString()} left to fill`
    );

    const fullOrder: OrderbookOrder = {
      signedOrder,
      state: OrderState.OPEN,
      remainingTakerTokenAmount: takerAmountRemaining,
    };
    this.db.orderbook.set(orderHash, fullOrder);
    this.emit('Orderbook.OrderAdded', fullOrder);
    return true;
  }

  async getOrders(options?: ApiOrderOptions | undefined): Promise<OrderbookOrder[]> {
    this.saveSnapshot();
    const orders = this.orderbookToArray().filter(x => x.state === OrderState.OPEN);
    return orders;
  }

  getTokenPairs(): Promise<TokenPair[]> {
    throw new Error('Method not implemented.');
  }

  async getOrder(orderHash: string): Promise<OrderbookOrder | undefined> {
    return this.db.orderbook.get(orderHash);
  }

  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse> {
    throw new Error('Method not implemented.');
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
        this.emit('Orderbook.Unrecgnized', msg);
        break;
    }
    callback();
  }

  private async getRemainingTakerAmount(
    orderHash: string,
    signedOrder: SignedOrder
  ): Promise<BigNumber.BigNumber> {
    const makerAmountUnavailable = await this.zeroEx.exchange.getUnavailableTakerAmountAsync(
      orderHash
    );
    const makerAmountRemaining = signedOrder.makerTokenAmount.sub(
      makerAmountUnavailable as BigNumber.BigNumber
    );
    return makerAmountRemaining;
  }

  private updateOrderbook(orderHash: string, updatedOrder: OrderbookOrder): boolean {
    this.db.orderbook.set(orderHash, updatedOrder);
    return true;
  }

  private async handleOrderFillMessage(msg: OrderFillMessage) {
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

    this.log('info', `Updating order ${orderHash} in orderbook - got a fill event`);
    const takerTokenAmountRemaining = await this.getRemainingTakerAmount(
      orderHash,
      existingOrder.signedOrder
    );
    this.log(
      'debug',
      `Updated Order ${orderHash} has ${takerTokenAmountRemaining.toString()} left to fill`
    );

    const updatedOrder: OrderbookOrder = {
      ...existingOrder,
      remainingTakerTokenAmount: takerTokenAmountRemaining,
    };
    this.updateOrderbook(orderHash, updatedOrder);

    this.emit('Orderbook.UpdatedOrder', updatedOrder);
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

  private emitError(message) {
    const err = new Error(`Orderbook error: ${message}`);
    this.log('error', err.message, { message: message });
    this.emit('error', err);
  }
  private saveSnapshot() {
    const datestamp = new Date().toISOString();
    const location = `./orderbook-${datestamp}.json`;
    writeFileSync(location, JSON.stringify(this.orderbookToArray()));
    this.log('debug', `Saved snapshot to ${location}`);
  }
}
