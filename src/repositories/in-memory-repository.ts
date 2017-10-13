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
} from '../types/0x-spec';
import { Logger } from '../util/logger';

export interface InMemoryDatabase {
  orderbook: Array<OrderbookOrder>; // old
  orderbookMap: Map<string, OrderbookOrder>; // new
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
    this.db = {
      orderbook: [],
      orderbookMap: new Map(),
      ...initialDb,
    };
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }

  // noop
  _read() {}

  _write(msg, encoding, callback) {
    // push downstream
    console.log('received message', msg);
    this.push(msg);
    switch (msg.type) {
      case 'order':
        break;
      default:
        this.emit('Repo.Unrecgnized', msg);
        break;
    }
    callback();
  }

  async postOrder(signedOrder: SignedOrder): Promise<boolean> {
    // missing pending field but i'm not sure what to do with that? docs are sparse
    const fullOrder: OrderbookOrder = {
      signedOrder,
      state: OrderState.OPEN,
      remainingTakerTokenAmount: signedOrder.makerTokenAmount,
    };
    this.db.orderbook.push(fullOrder);
    return true;
  }

  async getOrders(
    options?: ApiOrderOptions | undefined
  ): Promise<OrderbookOrder[]> {
    const orders = this.db.orderbook.filter(x => x.state === OrderState.OPEN);
    console.log('got orders', orders);
    return orders;
  }

  getTokenPairs(): Promise<TokenPair[]> {
    throw new Error('Method not implemented.');
  }

  getOrder(orderHash: string): Promise<OrderbookOrder> {
    throw new Error('Method not implemented.');
  }
  getFees(feePayload: ApiFeePayload): Promise<ApiFeeResponse> {
    throw new Error('Method not implemented.');
  }
}
