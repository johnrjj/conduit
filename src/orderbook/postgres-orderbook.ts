import * as BigNumber from 'bignumber.js';
import { Duplex } from 'stream';
import { ZeroEx } from '0x.js';
import { Pool } from 'pg';
import { SQL } from 'sql-template-strings';
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

export interface PostgresOrderbookOptions {
  postgresPool: Pool;
  orderTableName: string;
  tokenTableName: string;
  tokenPairTableName: string;
  logger?: Logger;
}

export interface PostgresOrderModel {
  exchange_contract_address: string;
  maker: string;
  taker: string;
  maker_token_address: string;
  taker_token_address: string;
  fee_recipient: string;
  maker_token_amount: string;
  taker_token_amount: string;
  maker_fee: string;
  taker_fee: string;
  expiration_unix_timestamp_sec: string;
  salt: string;
  ec_sig_v: string;
  ec_sig_r: string;
  ec_sig_s: string;
  order_hash: string;
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
        t1.symbol as base_token_symbol,
        t1.name as base_token_name,
        t1.min_amount as base_token_min_amount,
        t1.max_amount as base_token_max_amount,
        t1.precision as base_token_precision,
        t2.address as quote_token_address,
        t2.symbol as quote_token_alias,
        t2.name as quote_token_name,
        t2.min_amount as quote_token_min_amount,
        t2.max_amount as quote_token_max_amount,
        t2.precision as quote_token_precision
      from token_pairs tp
        INNER JOIN tokens t1 ON (tp.base_token = t1.address)
        INNER JOIN tokens t2 ON (tp.quote_token = t2.address)
    `);
    const pairs = res.rows.map(row => {
      const pair: TokenPair = {
        [row.base_token_alias]: {
          address: row.base_token_address,
          maxAmount: row.base_token_max_amount,
          minAmount: row.base_token_min_amount,
          precision: parseInt(row.base_token_precision, 10),
        },
        [row.quote_token_alias]: {
          address: row.quote_token_address,
          maxAmount: row.quote_token_max_amount,
          minAmount: row.quote_token_min_amount,
          precision: parseInt(row.quote_token_precision, 10),
        },
      };
      return pair;
    });
    return pairs;
  }

  private formatOrderFromDb(dbOrder: PostgresOrderModel): SignedOrder {
    const order: SignedOrder = {
      exchangeContractAddress: dbOrder.exchange_contract_address,
      maker: dbOrder.maker,
      taker: dbOrder.taker,
      makerTokenAddress: dbOrder.maker_token_address,
      takerTokenAddress: dbOrder.taker_token_address,
      feeRecipient: dbOrder.fee_recipient,
      makerTokenAmount: new BigNumber.BigNumber(dbOrder.maker_token_amount),
      takerTokenAmount: new BigNumber.BigNumber(dbOrder.taker_token_amount),
      makerFee: new BigNumber.BigNumber(dbOrder.maker_fee),
      takerFee: new BigNumber.BigNumber(dbOrder.taker_fee),
      expirationUnixTimestampSec: new BigNumber.BigNumber(dbOrder.expiration_unix_timestamp_sec),
      salt: new BigNumber.BigNumber(dbOrder.salt),
      ecSignature: {
        v: parseInt(dbOrder.ec_sig_v, 10),
        r: dbOrder.ec_sig_r,
        s: dbOrder.ec_sig_v,
      },
    };
    return order;
  }

  async getOrders(options?: ApiOrderOptions | undefined): Promise<SignedOrder[]> {
    const res = await this.pool.query(SQL`
      select * 
      from orders
  `);
    const formattedOrders = res.rows.map(this.formatOrderFromDb);
    return formattedOrders;
  }

  async getOrder(orderHash: string): Promise<SignedOrder> {
    const res = await this.pool.query(SQL`
      select * 
      from orders
      where order_hash = ${orderHash}
    `);
    console.log(res.rows[0]);
    const formattedOrder = this.formatOrderFromDb(res.rows[0]);
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
