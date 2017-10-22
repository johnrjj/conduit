// deprecated right now, will be added back in soon
// import * as BigNumber from 'bignumber.js';
// import { Duplex } from 'stream';
// import { writeFileSync } from 'fs';
// import { ZeroEx } from '0x.js';
// import { Orderbook } from './orderbook';
// import { FeeApiRequest, FeeApiResponse, ApiOrderOptions, TokenPair } from '../rest-api/types';
// import {
//   OrderbookOrder,
//   OrderState,
//   SignedOrder,
//   OrderHash,
//   OrderCancelMessage,
//   OrderFillMessage,
//   BlockchainLogEvent,
// } from '../types/core';
// import { Logger } from '../util/logger';

// export interface InMemoryDatabase {
//   orderbook: Map<OrderHash, OrderbookOrder>;
// }

// // todo:refactor - most of this can go in orderbook base class
// export class InMemoryOrderbook extends Duplex implements Orderbook {
//   private db: InMemoryDatabase;
//   private zeroEx: ZeroEx;
//   private logger: Logger;

//   constructor({
//     zeroEx,
//     logger,
//     initialDb,
//   }: {
//     zeroEx: ZeroEx;
//     logger: Logger;
//     initialDb?: InMemoryDatabase;
//   }) {
//     super({ objectMode: true, highWaterMark: 1024 });
//     this.zeroEx = zeroEx;
//     this.logger = logger;
//     if (initialDb) {
//       this.log(
//         'debug',
//         `Seed data given, seeding in-memory db with ${initialDb.orderbook.size} order(s)`
//       );
//     }
//     this.db = { orderbook: new Map(), ...initialDb };
//   }

//   getOrderbook(): Map<string, OrderbookOrder> {
//     return this.db.orderbook;
//   }

//   async postOrder(orderHash: OrderHash, signedOrder: SignedOrder): Promise<void> {
//     if (this.getOrder(orderHash)) {
//       this.log(
//         'info',
//         `Order ${orderHash} already exists in orderbook, ignoring order post request`
//       );
//       throw new Error('Order already exists');
//     }
//     const remainingTakerTokenAmount = await this.getRemainingTakerAmount(orderHash, signedOrder);
//     this.logger.log(
//       'debug',
//       `New Order ${orderHash} has ${remainingTakerTokenAmount.toString()} left to fill`
//     );

//     const state = remainingTakerTokenAmount.greaterThan(0) ? OrderState.OPEN : OrderState.CLOSED;

//     const fullOrder: OrderbookOrder = {
//       signedOrder,
//       state,
//       remainingTakerTokenAmount,
//     };

//     this.db.orderbook.set(orderHash, fullOrder);
//   }

//   async getOrders(options?: ApiOrderOptions | undefined): Promise<SignedOrder[]> {
//     throw new Error('Method not implemented.');
//   }

//   getTokenPairs(): Promise<Array<TokenPair>> {
//     throw new Error('Method not implemented.');
//   }

//   async getOrder(orderHash: string): Promise<SignedOrder> {
//     throw new Error('Method not implemented.');
//     // return this.db.orderbook.get(orderHash);
//   }

//   getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse> {
//     throw new Error('Method not implemented.');
//   }

//   // noop
//   _read() {}

//   _write(msg, encoding, callback) {
//     this.log('debug', `InMemoryRepo received a message of type ${msg.type || 'unknown'}`);
//     // push downstream
//     this.push(msg);
//     switch (msg.type) {
//       case 'Blockchain.LogFill':
//         const blockchainFillLog = msg as BlockchainLogEvent;
//         this.handleOrderFillMessage(blockchainFillLog.args as OrderFillMessage);
//         break;
//       case 'Blockchain.LogCancel':
//         const blockchainCancelLog = msg as BlockchainLogEvent;
//         this.log(
//           'debug',
//           'Doing nothing with Blockchain.LogCancel right now in in-memory orderbook'
//         );
//         break;
//       default:
//         // this.emit(EventTypes.CONDUIT_UNKNOWN, msg);
//         break;
//     }
//     callback();
//   }

//   private async getRemainingTakerAmount(
//     orderHash: string,
//     signedOrder: SignedOrder
//   ): Promise<BigNumber.BigNumber> {
//     const takerAmountUnavailable = await this.zeroEx.exchange.getUnavailableTakerAmountAsync(
//       orderHash
//     );
//     const takerAmountRemaining = signedOrder.takerTokenAmount.sub(
//       new BigNumber.BigNumber(takerAmountUnavailable)
//     );
//     return takerAmountRemaining;
//   }

//   private updateOrderbook(orderHash: string, updatedOrder: OrderbookOrder): boolean {
//     this.db.orderbook.set(orderHash, updatedOrder);
//     return true;
//   }

//   private async handleOrderFillMessage(msg: OrderFillMessage) {
//     const { orderHash, filledMakerTokenAmount, filledTakerTokenAmount } = msg;
//     this.log(
//       'debug',
//       `Order ${orderHash} details:
//       FilledMakerAmount: ${filledMakerTokenAmount.toString()}
//       FilledTakerAmount: ${filledTakerTokenAmount.toString()}`
//     );

//     const existingOrder = this.getOrderbook().get(orderHash);

//     if (!existingOrder) {
//       this.log(
//         'debug',
//         `Order ${orderHash} from OrderFillMessage does not exist in our orderbook, skipping`
//       );
//       return;
//     }

//     this.log('info', `Updating order ${orderHash} in orderbook - got a fill event`);
//     const remainingTakerTokenAmount = await this.getRemainingTakerAmount(
//       orderHash,
//       existingOrder.signedOrder
//     );
//     this.log(
//       'debug',
//       `Updated Order ${orderHash} has ${remainingTakerTokenAmount.toString()} left to fill`
//     );

//     const state = remainingTakerTokenAmount.greaterThan(0) ? OrderState.OPEN : OrderState.CLOSED;

//     const updatedOrder: OrderbookOrder = {
//       ...existingOrder,
//       remainingTakerTokenAmount,
//       state,
//     };
//     this.updateOrderbook(orderHash, updatedOrder);

//     // this.emit(EventTypes.CONDUIT_ORDER_UPDATE, updatedOrder);
//   }

//   private orderbookToArray() {
//     return Array.from(this.db.orderbook.values());
//   }

//   private log(level: string, message: string, meta?: any) {
//     if (!this.logger) {
//       return;
//     }
//     this.logger.log(level, message, meta);
//   }

//   private emitError(message) {
//     const err = new Error(`Orderbook error: ${message}`);
//     this.log('error', err.message, { message: message });
//     this.emit('error', err);
//   }

//   private saveSnapshot() {
//     const datestamp = new Date().toISOString();
//     const location = `./orderbook-${datestamp}.json`;
//     writeFileSync(location, JSON.stringify(this.orderbookToArray()));
//     this.log('debug', `Saved snapshot to ${location}`);
//   }
// }
