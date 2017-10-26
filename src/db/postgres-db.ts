import { BigNumber } from 'bignumber.js';
import { Duplex } from 'stream';
import { ZeroEx, SignedOrder } from '0x.js';
import { Pool } from 'pg';
import { SQL } from 'sql-template-strings';
import { RelayDatabase } from './types';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions, TokenPair } from '../rest-api/types';
import {
  OrderbookOrder,
  OrderState,
  OrderHash,
  OrderbookPair,
  OrderCancelMessage,
  OrderFillMessage,
  BlockchainLogEvent,
} from '../types/core';
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

export class PostgresRelayDatabase extends Duplex implements RelayDatabase {
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
    this.tokenPairsTableName = tokenPairTableName || 'token_pairs';
    this.logger = logger;

    this.validatePostgresInstance();
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

  async getOrders(options?: ApiOrderOptions | undefined): Promise<SignedOrder[]> {
    const res = await this.pool.query(SQL`
      select * 
      from orders
  `);
    const formattedOrders = res.rows.map(this.formatOrderFromDb);
    return formattedOrders;
  }

  async getOrder(orderHash: string): Promise<SignedOrder | null> {
    const res = await this.pool.query(SQL`
      select * 
      from orders
      where order_hash = ${orderHash}
    `);
    if (res.rows.length === 0) {
      this.log('debug', `No order ${orderHash} found in database`);
      return null;
    }
    const formattedOrder = this.formatOrderFromDb(res.rows[0]);
    return formattedOrder;
  }

  async getOrderbook(baseTokenAddress, quoteTokenAddress): Promise<OrderbookPair> {
    const bidsQueryResPromise = this.pool.query(SQL`
      select * 
      from orders
      where maker_token_address = ${baseTokenAddress}
      and taker_token_address = ${quoteTokenAddress}
    `);

    const asksQueryResPromise = this.pool.query(SQL`
      select * 
      from orders
      where maker_token_address = ${quoteTokenAddress}
      and taker_token_address = ${baseTokenAddress}
  `);

    try {
      const bidQueryRes = await bidsQueryResPromise;
      const asksQueryRes = await asksQueryResPromise;

      const bids = bidQueryRes.rows.map(this.formatOrderFromDb);
      const asks = asksQueryRes.rows.map(this.formatOrderFromDb);

      const orderbookPair = {
        bids,
        asks,
      };
      return orderbookPair;
    } catch (err) {
      this.log('debug', `Error querying for bids and asks`, err);
      throw err;
    }
  }

  async getFees(feePayload: FeeApiRequest): Promise<FeeApiResponse> {
    const freeFee: FeeApiResponse = {
      feeRecipient: '0x0000000000000000000000000000000000000000',
      makerFee: '0',
      takerFee: '0',
    };
    return freeFee;
  }

  async postOrder(orderHash: string, signedOrder: SignedOrder): Promise<void> {
    try {
      const res = await this.pool.query(SQL`INSERT INTO 
      "orders"(
        "exchange_contract_address", 
        "maker", 
        "taker", 
        "maker_token_address", 
        "taker_token_address", 
        "fee_recipient", 
        "maker_token_amount", 
        "taker_token_amount", 
        "maker_fee",
        "taker_fee", 
        "expiration_unix_timestamp_sec", 
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
        ${signedOrder.makerTokenAmount.toString()}, 
        ${signedOrder.takerTokenAmount.toString()}, 
        ${signedOrder.makerFee.toString()}, 
        ${signedOrder.takerFee.toString()}, 
        ${signedOrder.expirationUnixTimestampSec.toString()}, 
        ${signedOrder.salt.toString()}, 
        ${signedOrder.ecSignature.v}, 
        ${signedOrder.ecSignature.r}, 
        ${signedOrder.ecSignature.s},
        ${orderHash}
      ) 
      `);
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

  private validatePostgresInstance() {
    this.pool
      .query(SQL`select to_regclass(${this.orderTableName})`)
      .then(res => !res.rows[0].to_regclass && this.log('debug', 'Orders table does not exist'))
      .catch(e => this.log('error', 'Error checking if orders table exists'));
  }

  private query({ text, params }) {
    return this.pool.query(text, params);
  }

  private formatOrderFromDb(dbOrder: PostgresOrderModel): SignedOrder {
    const order: SignedOrder = {
      exchangeContractAddress: dbOrder.exchange_contract_address,
      maker: dbOrder.maker,
      taker: dbOrder.taker,
      makerTokenAddress: dbOrder.maker_token_address,
      takerTokenAddress: dbOrder.taker_token_address,
      feeRecipient: dbOrder.fee_recipient,
      makerTokenAmount: new BigNumber(dbOrder.maker_token_amount),
      takerTokenAmount: new BigNumber(dbOrder.taker_token_amount),
      makerFee: new BigNumber(dbOrder.maker_fee),
      takerFee: new BigNumber(dbOrder.taker_fee),
      expirationUnixTimestampSec: new BigNumber(dbOrder.expiration_unix_timestamp_sec),
      salt: new BigNumber(dbOrder.salt),
      ecSignature: {
        v: parseInt(dbOrder.ec_sig_v, 10),
        r: dbOrder.ec_sig_r,
        s: dbOrder.ec_sig_v,
      },
    };
    return order;
  }

  private log(level: string, message: string, meta?: any) {
    if (!this.logger) {
      return;
    }
    this.logger.log(level, message, meta);
  }
}
