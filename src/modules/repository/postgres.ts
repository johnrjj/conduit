import { BigNumber } from 'bignumber.js';
import { Duplex } from 'stream';
import { Pool } from 'pg';
import { SQL } from 'sql-template-strings';
import { ZeroEx, SignedOrder, Token } from '0x.js';
import { RedisClient } from 'redis';
import { Repository } from './types';
import { Relay, OrderRelevantState } from '../client/types';
import {
  OrderbookPair,
  ZeroExOrderFillEvent,
  ZeroExOrderCancelEvent,
  TokenPair,
  OrderFilterOptions,
  SerializedSignedOrderWithCurrentBalance,
  SignedOrderWithCurrentBalance,
  FeeQueryRequest,
  FeeQueryResponse,
} from '../..//types';
import { serializeSignedOrder } from '../..//util/order';
import { Logger } from '../..//util/logger';

export interface PostgresRepositoryOptions {
  postgresPool: Pool;
  orderTableName: string;
  tokenTableName: string;
  tokenPairTableName: string;
  logger?: Logger;
}

// TODO: TWO PHASE COMMITS w/ ROLLBACK STEP
export class PostgresRepository implements Repository {
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
  }: PostgresRepositoryOptions) {
    this.pool = postgresPool;
    this.orderTableName = orderTableName || 'orders';
    this.tokenTableName = tokenTableName || 'tokens';
    this.tokenPairsTableName = tokenPairTableName || 'token_pairs';
    this.logger = logger;
  }

  async getTokenPairs(): Promise<Array<TokenPair>> {
    const res = await this.pool.query(SQL`
      SELECT 
        t1.address as base_token_address,
        t1.symbol as base_token_symbol,
        t1.name as base_token_name,
        t1.min_amount as base_token_min_amount,
        t1.max_amount as base_token_max_amount,
        t1.precision as base_token_precision,
        t2.address as quote_token_address,
        t2.symbol as quote_token_symbol,
        t2.name as quote_token_name,
        t2.min_amount as quote_token_min_amount,
        t2.max_amount as quote_token_max_amount,
        t2.precision as quote_token_precision
      FROM token_pairs tp
        INNER JOIN tokens t1 ON (tp.base_token = t1.address)
        INNER JOIN tokens t2 ON (tp.quote_token = t2.address)
    `);
    const pairs = res.rows.map(row => {
      const pair: TokenPair = {
        [row.base_token_symbol]: {
          address: row.base_token_address,
          maxAmount: row.base_token_max_amount,
          minAmount: row.base_token_min_amount,
          precision: parseInt(row.base_token_precision, 10),
        },
        [row.quote_token_symbol]: {
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

  async getOrders(options?: OrderFilterOptions): Promise<SignedOrder[]> {
    const query = SQL`
      SELECT * 
      FROM orders
    `;
    // todo, support all options after MVP
    if (options && options.isOpen) {
      query.append(SQL`WHERE taker_token_remaining_amount > 0`);
    }
    const res = await this.pool.query(query);
    const formattedOrders = res.rows.map(this.formatOrderFromDb);
    return formattedOrders;
  }

  async getOrder(orderHash: string): Promise<SignedOrder | null> {
    const res = await this.pool.query(SQL`
      SELECT * 
      FROM orders
      WHERE order_hash = ${orderHash}
    `);
    if (res.rows.length === 0) {
      return null;
    }
    const formattedOrder = this.formatOrderFromDb(res.rows[0]);
    return formattedOrder;
  }

  async updateOrder(orderHash: string, orderState: OrderRelevantState): Promise<SignedOrder> {
    const { remainingFillableTakerTokenAmount } = orderState;
    this.updateRemainingTakerTokenAmountForOrderInDatabase(
      orderHash,
      remainingFillableTakerTokenAmount
    );
    const signedOrder = await this.getOrder(orderHash);
    if (!signedOrder) {
      throw Error('Could not update, order does not exist');
    }
    return signedOrder;
  }

  async getOrderbookForTokenPair(baseTokenAddress, quoteTokenAddress): Promise<OrderbookPair> {
    const bidsQueryResPromise = this.pool.query(SQL`
      SELECT * 
      FROM orders
      WHERE maker_token_address = ${baseTokenAddress}
        and taker_token_address = ${quoteTokenAddress}
    `);
    const asksQueryResPromise = this.pool.query(SQL`
      SELECT * 
      FROM orders
      WHERE maker_token_address = ${quoteTokenAddress}
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

  async getFees(feePayload: FeeQueryRequest): Promise<FeeQueryResponse> {
    const freeFee: FeeQueryResponse = {
      feeRecipient: '0x0000000000000000000000000000000000000000',
      makerFee: '0',
      takerFee: '0',
    };
    return freeFee;
  }

  async addOrder(
    orderHash: string,
    takerTokenRemainingAmount: BigNumber,
    signedOrder: SignedOrder
  ): Promise<SignedOrder> {
    try {
      const res = await this.pool.query(SQL`
      INSERT INTO 
        orders (
          exchange_contract_address, 
          maker, 
          taker, 
          maker_token_address, 
          taker_token_address, 
          fee_recipient, 
          maker_token_amount, 
          taker_token_amount, 
          maker_fee,
          taker_fee, 
          expiration_unix_timestamp_sec, 
          salt, 
          ec_sig_v, 
          ec_sig_r, 
          ec_sig_s,
          order_hash,
          taker_token_remaining_amount
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
          ${orderHash},
          ${takerTokenRemainingAmount.toString()}
      )`);
    } catch (err) {
      this.log('error', `Error inserting order ${orderHash} into postgres.`, err);
      throw err;
    }
    return signedOrder;
  }

  async addTokenPair(baseTokenAddress, quoteTokenAddress) {
    await this.pool.query(SQL`
      INSERT 
      INTO    token_pairs
              (base_token, quote_token)
      VALUES  (${baseTokenAddress}, ${quoteTokenAddress})
    `);
  }

  async addToken(token: Token) {
    // note: right now we're overloading 'precision' column with 'decimals' value, need to post issue on relayer spec asking for clarification
    await this.pool.query(SQL`
      INSERT 
      INTO    tokens
              (address, symbol, min_amount, max_amount, precision, name)
      VALUES  (${token.address}, ${token.symbol}, ${0}, ${1000000000000000000}, ${
      token.decimals
    }, ${token.name})
    `);
    return token;
  }

  async getBaseTokenAndQuoteTokenFromMakerAndTaker(
    takerTokenAddress,
    makerTokenAddress
  ): Promise<{ baseToken: string; quoteToken: string }> {
    const res = await this.pool.query(SQL`
    SELECT base_token, quote_token
    FROM token_pairs
    WHERE (base_token = ${takerTokenAddress} AND quote_token = ${makerTokenAddress})
       OR (base_token = ${makerTokenAddress} AND quote_token = ${takerTokenAddress})
    `);
    if (res.rowCount < 1) {
      throw Error('Could not find token pair');
    }
    const { base_token, quote_token } = res.rows[0];
    return {
      baseToken: base_token,
      quoteToken: quote_token,
    };
  }

  private async updateRemainingTakerTokenAmountForOrderInDatabase(
    orderHash: string,
    filledTakerTokenAmount: BigNumber
  ) {
    await this.pool.query(SQL`
      UPDATE orders 
      SET taker_token_remaining_amount = taker_token_remaining_amount - ${filledTakerTokenAmount.toString()}
      WHERE order_hash = ${orderHash};
    `);
  }

  // consolidate with getOrder
  private async getFullOrder(orderHash: string): Promise<SignedOrderWithCurrentBalance | null> {
    const res = await this.pool.query(SQL`
        SELECT * 
        FROM orders
        WHERE order_hash = ${orderHash}
      `);
    if (res.rows.length === 0) {
      this.log('verbose', `No order ${orderHash} found in database`);
      return null;
    }
    const formattedOrder: SignedOrderWithCurrentBalance = {
      ...this.formatOrderFromDb(res.rows[0]),
      takerTokenAmountRemaining: res.rows[0]['remaining_taker_taken_amount'],
    };
    return formattedOrder;
  }

  private validatePostgresInstance() {
    this.pool
      .query(SQL`SELECT to_regclass(${this.orderTableName})`)
      .then(res => !res.rows[0].to_regclass && this.log('debug', 'Orders table does not exist'))
      .catch(e => this.log('error', 'Error checking if orders table exists'));
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
        s: dbOrder.ec_sig_s,
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
  taker_token_remaining_amount: string;
}

export interface PostgresTokenPairsModel {
  base_token: string;
  quote_token: string;
}

export interface PostgresTokenModel {
  address: string;
  symbol: string; // ex: 'ZRX'
  name: string; // ex: 'ZeroEx Token'
  min_amount: string;
  max_amount: string;
  precision: number;
}
