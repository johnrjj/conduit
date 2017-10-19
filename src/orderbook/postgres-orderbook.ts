import * as BigNumber from 'bignumber.js';
import { Duplex } from 'stream';
import { writeFileSync } from 'fs';
import { ZeroEx } from '0x.js';
import { Orderbook } from './orderbook';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions } from '../rest-api/types';
import {
  OrderbookOrder,
  OrderState,
  SignedOrder,
  OrderHash,
  OrderCancelMessage,
} from '../types/core';
import { BlockchainLogEvent, OrderFillMessage } from '../types/core';
import { EventTypes } from '../types/events';
import { Logger } from '../util/logger';


class PostgresOrderbook extends Duplex implements Orderbook {
  getTokenPairs(): Promise<string[][]> {
    throw new Error("Method not implemented.");
  }
  getOrders(options?: ApiOrderOptions | undefined): Promise<OrderbookOrder[]> {
    throw new Error("Method not implemented.");
  }
  getOrder(orderHash: string): Promise<OrderbookOrder | undefined> {
    throw new Error("Method not implemented.");
  }
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse> {
    throw new Error("Method not implemented.");
  }
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  _write(chunk: any, encoding: string, callback: Function): void {
    throw new Error("Method not implemented.");
  }
  _read(size: number): void {
    throw new Error("Method not implemented.");
  }
}