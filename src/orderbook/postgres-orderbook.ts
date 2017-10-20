import * as BigNumber from 'bignumber.js';
import { Duplex } from 'stream';
// import { writeFileSync } from 'fs';
import { ZeroEx } from '0x.js';
import { Orderbook } from './orderbook';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions } from '../rest-api/types';
import {
  OrderbookOrder,
  OrderState,
  SignedOrder,
  OrderHash,
  OrderCancelMessage,
  OrderFillMessage,
  BlockchainLogEvent,
} from '../types/core';
import { EventTypes } from '../types/events';
import { Logger } from '../util/logger';
import { Pool } from 'pg';

export interface PostgresOrderbookOptions {
  postgresPool: Pool;
  orderTableName: string;
  tokenTableName: string;
  logger?: Logger;
}

export class PostgresOrderbook extends Duplex implements Orderbook {
  private pool: Pool;
  private orderTableName: string;
  private tokenTableName: string;
  private logger?: Logger;

  constructor({ postgresPool, orderTableName, tokenTableName, logger }: PostgresOrderbookOptions) {
    super();
    this.pool = postgresPool;
    this.orderTableName = orderTableName;
    this.tokenTableName = tokenTableName;
    this.logger = logger;

    this.pool
      .query("SELECT to_regclass('orders')")
      .then(
        res =>
          res.rows[0].to_regclass
            ? this.log('debug', 'Orders table exists')
            : this.log('debug', 'Orders table does not exist')
      )
      .catch(e => this.log('error', 'Error checking for orders table'));
  }

  private query({ text, params }) {
    return this.pool.query(text, params);
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }

  getTokenPairs(): Promise<string[][]> {
    throw new Error('Method not implemented.');
  }
  getOrders(options?: ApiOrderOptions | undefined): Promise<OrderbookOrder[]> {
    throw new Error('Method not implemented.');
  }
  getOrder(orderHash: string): Promise<OrderbookOrder | undefined> {
    throw new Error('Method not implemented.');
  }
  getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse> {
    throw new Error('Method not implemented.');
  }
  postOrder(orderHash: string, signedOrder: SignedOrder): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  _write(chunk: any, encoding: string, callback: Function): void {
    throw new Error('Method not implemented.');
  }
  _read(size: number): void {
    throw new Error('Method not implemented.');
  }
}
