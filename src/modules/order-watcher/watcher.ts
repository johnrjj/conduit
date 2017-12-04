import { ZeroEx, SignedOrder, OrderState, OrderStateValid } from '0x.js';
import { RedisClient } from 'redis';
import { Relay } from '../client/types';
import { Logger } from '../../util/logger';
import { serializeSignedOrder, deserializeSignedOrder } from '../../util/order';
import { Publisher } from '../publisher';
import { Subscriber } from '../subscriber';
import { ORDER_ADDED, OrderAdded, OrderEvent } from '../events';
import { SerializedSignedOrder } from '../../types';

export interface OrderWatcherConfig {
  zeroEx: ZeroEx;
  relay: Relay;
  publisher: Publisher;
  subscriber: Subscriber;
  logger: Logger;
}

export class OrderWatcher {
  private zeroEx: ZeroEx;
  private relay: Relay;
  private publisher: Publisher;
  private subscriber: Subscriber;
  private logger: Logger;
  private watchedOrders: Set<OrderHash> = new Set();

  constructor({ zeroEx, relay, publisher, subscriber, logger }: OrderWatcherConfig) {
    this.zeroEx = zeroEx;
    this.relay = relay;
    this.publisher = publisher;
    this.subscriber = subscriber;
    this.logger = logger;

    this.log('verbose', `OrderWatcher subscribing to ${ORDER_ADDED} message channel`);
    this.subscriber.subscribe(ORDER_ADDED, this.handleOrderAddedEvent.bind(this));
    this.log('verbose', `OrderWatcher subscribed to ${ORDER_ADDED} message channel`);

    this.zeroEx.orderStateWatcher.subscribe(this.handleOrderStateUpdate.bind(this));
    this.log('verbose', 'OrderWatcher initialized ZeroEx OrderStateWatcher subscription');
  }

  private async handleOrderAddedEvent(orderAddedEvent: OrderEvent<OrderAdded>) {
    const { type, payload } = orderAddedEvent;
    const signedOrder = deserializeSignedOrder(orderAddedEvent.payload.order as any);
    const orderHash = ZeroEx.getOrderHashHex(orderAddedEvent.payload.order);
    this.log(
      'debug',
      `OrderWatcher: New order added, adding to active watcher ${orderHash}`,
      orderAddedEvent
    );
    this.watchOrder(signedOrder);
  }

  async watchOrderBatch(orders: Array<SignedOrder>) {
    return await Promise.all(orders.map(this.watchOrder.bind(this)));
  }

  async watchOrder(order: SignedOrder) {
    const orderHash = ZeroEx.getOrderHashHex(order);
    console.log(orderHash);
    if (this.watchedOrders.has(orderHash)) {
      return;
    }
    this.watchedOrders.add(orderHash);
    return await this.zeroEx.orderStateWatcher.addOrder(order);
  }

  // todo finish this logic...
  private handleOrderStateUpdate = async (orderState: OrderState) => {
    if (isOrderStateValid(orderState)) {
      const { orderHash, orderRelevantState } = orderState;
      this.log(
        'verbose',
        `Order ${orderHash} update (valid)
        Remaining maker amount: ${orderRelevantState.remainingFillableMakerTokenAmount.toString()}
        Remaining taker amount: ${orderRelevantState.remainingFillableTakerTokenAmount.toString()}`,
        orderRelevantState
      );
      this.relay.updateOrder(orderHash, orderRelevantState);
      return;
    } else {
      const { orderHash, error } = orderState;
      return;
    }
  };

  private log(level: string, message: string, meta?: any): void {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}

// convenience type
export type OrderHash = string;

const isOrderStateValid = (orderState: OrderState): orderState is OrderStateValid =>
  orderState.isValid;
