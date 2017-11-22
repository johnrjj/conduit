import { ZeroEx, SignedOrder, OrderState, OrderStateValid, OrderStateInvalid } from '0x.js';
import { RedisClient } from 'redis';
import { Relay } from '../relay/types';

export class OrderWatcher {
  // key is orderhash
  private watchedOrders: Set<string> = new Set();

  constructor(
    private zeroEx: ZeroEx,
    private relay: Relay,
    private redisPublisher: RedisClient,
    private redisSubscriber: RedisClient
  ) {}

  async watchOrderBatch(orders: Array<SignedOrder>) {
    return await Promise.all(orders.map(this.watchOrder.bind(this)));
  }

  async watchOrder(order: SignedOrder) {
    const orderHash = ZeroEx.getOrderHashHex(order);
    if (this.watchedOrders.has(orderHash)) {
      return;
    }
    this.watchedOrders.add(orderHash);
    return await this.zeroEx.orderStateWatcher.addOrderAsync(order);
  }

  private setupOrderWatcher() {
    const orderStateWatcher = this.zeroEx.orderStateWatcher;
    this.zeroEx.orderStateWatcher.subscribe(this.handleOrderStateUpdate);
  }

  private handleOrderStateUpdate = (orderState: OrderState) => {
    console.log(orderState);
    if (isOrderStateValid(orderState)) {
      const { orderHash, orderRelevantState } = orderState;
      this.relay.updateOrder(orderHash, orderRelevantState);
      console.log(orderState.orderRelevantState);
    } else {
      const { orderHash, error } = orderState;
    }
  };
}

const isOrderStateValid = (orderState: OrderState): orderState is OrderStateValid =>
  (<OrderStateValid>orderState).isValid;
