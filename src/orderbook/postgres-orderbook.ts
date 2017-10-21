import * as BigNumber from 'bignumber.js';
import { Duplex } from 'stream';
import { ZeroEx } from '0x.js';
import { Orderbook } from './orderbook';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions, TokenPair } from '../rest-api/types';
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
import { SQL } from 'sql-template-strings';
const TOKEN_PAIRS_QUERY = '';

export interface PostgresOrderbookOptions {
  postgresPool: Pool;
  orderTableName: string;
  tokenTableName: string;
  tokenPairTableName: string;
  logger?: Logger;
}

export class PostgresOrderbook extends Duplex implements Orderbook {
  private pool: Pool;
  private orderTableName: string;
  private tokenTableName: string;
  private tokenPairsTableName: string;
  private logger?: Logger;

  constructor({
    postgresPool,
    orderTableName,
    tokenTableName,
    tokenPairTableName,
    logger,
  }: PostgresOrderbookOptions) {
    super();
    this.pool = postgresPool;
    this.orderTableName = orderTableName || 'orders';
    this.tokenTableName = tokenTableName || 'tokens';
    this.tokenPairsTableName = 'token_pairs';
    this.logger = logger;

    this.pool
      .query(SQL`select to_regclass(${this.orderTableName})`)
      .then(res => !res.rows[0].to_regclass && this.log('debug', 'Orders table does not exist'))
      .catch(e => this.log('error', 'Error checking if orders table exists'));
  }

  private query({ text, params }) {
    return this.pool.query(text, params);
  }

  async getTokenPairs(): Promise<Array<TokenPair>> {
    const res = await this.pool.query(SQL`
      select 
        t1.address as base_token_address,
        t1.alias as base_token_alias,
        t1.min_amount as base_token_min_amount,
        t1.max_amount as base_token_max_amount,
        t1.precision as base_token_precision,
        t2.address as quote_token_address,
        t2.alias as quote_token_alias,
        t2.min_amount as quote_token_min_amount,
        t2.max_amount as quote_token_max_amount,
        t2.precision as quote_token_precision
      from token_pairs tp
        INNER JOIN tokens t1 ON (tp.base_token = t1.address)
        INNER JOIN tokens t2 ON (tp.quote_token = t2.address)
    `);
    const pairs = res.rows;
    const formattedPairs = pairs; // format here...
    return pairs;
  }

  async getOrders(options?: ApiOrderOptions | undefined): Promise<OrderbookOrder[]> {
    const res = await this.pool.query(SQL`
    select * 
    from orders
  `);
    const unformattedOrders = res.rows;
    const formattedOrders = unformattedOrders; //.map(mapRawOrderToSignedOrder);
    return formattedOrders;
  }

  async getOrder(orderHash: string): Promise<OrderbookOrder | undefined> {
    const res = await this.pool.query(SQL`
      select * 
      from orders
      where order_hash = ${orderHash}
    `);
    console.log(res.rows[0]);
    const formattedOrder = res.rows[0];
    return formattedOrder;
  }

  async getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse> {
    const freeFee: FeeApiResponse = {
      feeRecipient: '0x0000000000000000000000000000000000000000',
      makerFee: '0',
      takerFee: '0',
    };
    return freeFee;
  }

  async postOrder(orderHash: string, signedOrder: SignedOrder): Promise<boolean> {
    try {
      const res = await this.pool.query(SQL`INSERT INTO 
      "orders"(
        "exchangeContractAddress", 
        "maker", 
        "taker", 
        "makerTokenAddress", 
        "takerTokenAddress", 
        "feeRecipient", 
        "makerTokenAmount", 
        "takerTokenAmount", 
        "makerFee",
        "takerFee", 
        "expirationUnixTimestampSec", 
        "salt", 
        "ec_sig_v", 
        "ec_sig_r", 
        "ec_sig_s",
        "order_hash"
      ) 
      VALUES(
        ${signedOrder.exchangeContractAddress}, 
        ${signedOrder.maker}, 
        ${signedOrder.taker}, 
        ${signedOrder.makerTokenAddress}, 
        ${signedOrder.takerTokenAddress}, 
        ${signedOrder.feeRecipient}, 
        ${signedOrder.makerTokenAmount}, 
        ${signedOrder.takerTokenAmount}, 
        ${signedOrder.makerFee}, 
        ${signedOrder.takerFee}, 
        ${signedOrder.expirationUnixTimestampSec}, 
        ${signedOrder.salt}, 
        ${signedOrder.ecSignature.v}, 
        ${signedOrder.ecSignature.r}, 
        ${signedOrder.ecSignature.s},
        ${orderHash}
      ) 
      `);
      return true;
    } catch (err) {
      this.log('error', `Error inserting order ${orderHash} into postgres.`, err);
      throw err;
    }
  }

  _write(chunk: any, encoding: string, callback: Function): void {
    throw new Error('Method not implemented.');
  }

  _read(size: number): void {
    console.log('read postgres orderbook size:', size);
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
