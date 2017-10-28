import { BigNumber } from 'bignumber.js';
import { Duplex } from 'stream';
import { Pool } from 'pg';
import { SQL } from 'sql-template-strings';
import { ZeroEx, SignedOrder, Token } from '0x.js';
import { RelayDatabase, SignedOrderWithCurrentBalance } from './types';
import { FeeApiRequest, FeeApiResponse, ApiOrderOptions, TokenPair } from '../rest-api/types';
import { Message, OrderbookUpdate } from '../ws-api/types';
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
  zeroEx: ZeroEx;
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

export class PostgresRelayDatabase extends Duplex implements RelayDatabase {
  private pool: Pool;
  private orderTableName: string;
  private tokenTableName: string;
  private tokenPairsTableName: string;
  private zeroEx: ZeroEx;
  private logger?: Logger;

  constructor({
    postgresPool,
    orderTableName,
    tokenTableName,
    tokenPairTableName,
    zeroEx,
    logger,
  }: PostgresOrderbookOptions) {
    super({ objectMode: true, highWaterMark: 1024 });
    this.pool = postgresPool;
    this.orderTableName = orderTableName || 'orders';
    this.tokenTableName = tokenTableName || 'tokens';
    this.tokenPairsTableName = tokenPairTableName || 'token_pairs';
    this.zeroEx = zeroEx;
    this.logger = logger;

    this.validatePostgresInstance();
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
        t2.symbol as quote_token_alias,
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

  async getOrders(options?: ApiOrderOptions): Promise<SignedOrder[]> {
    const res = await this.pool.query(SQL`
      SELECT * 
      FROM orders
  `);
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
      this.log('verbose', `No order ${orderHash} found in database`);
      return null;
    }
    const formattedOrder = this.formatOrderFromDb(res.rows[0]);
    return formattedOrder;
  }

  async getOrderbook(baseTokenAddress, quoteTokenAddress): Promise<OrderbookPair> {
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

    // emit event
    const event: Message<OrderbookUpdate> = {
      type: 'update',
      channel: 'orderbook',
      payload: signedOrder,
    };
    this.emit('orderbook:update', event);
  }

  protected async getSnapshot() {
    throw new Error('not yet implemented');
  }

  async addTokenPair(baseTokenAddress, quoteTokenAddress) {
    const insertRes = await this.pool.query(SQL`
      INSERT 
      INTO    token_pairs
              (base_token, quote_token)
      VALUES  (${baseTokenAddress}, ${quoteTokenAddress})
    `);
  }

  async addToken(token: Token) {
    // note: right now we're overloading precision with decimals, need to post issue on relayer spec asking for clarification
    const res = await this.pool.query(SQL`
      INSERT 
      INTO    tokens
              (address, symbol, min_amount, max_amount, precision, name)
      VALUES  (${token.address}, ${token.symbol}, ${0}, ${1000000000000000000}, ${token.decimals}, ${token.name})
    `);
  }

  _write(msg, encoding, callback) {
    this.log('debug', `Postgres Relay received a message of type ${msg.type || 'unknown'}`);
    // push downstream
    this.push(msg);
    switch (msg.type) {
      case 'Blockchain.LogFill':
        const blockchainFillLog = msg as BlockchainLogEvent;
        const payload = blockchainFillLog.args as OrderFillMessage;
        this.handleOrderFillMessage(blockchainFillLog.args as OrderFillMessage);
        break;
      case 'Blockchain.LogCancel':
        const blockchainCancelLog = msg as BlockchainLogEvent;
        this.log('debug', 'Doing nothing with Blockchain.LogCancel right now');
        break;
      default:
        this.log(
          'debug',
          `Postgres Relay received event ${msg.type} it doesn't know how to handle`
        );
        break;
    }
    callback();
  }

  _read(size: number): void {}

  private async handleOrderFillMessage(fillMessage: OrderFillMessage) {
    const { orderHash, filledMakerTokenAmount, filledTakerTokenAmount } = fillMessage;
    this.log(
      'debug',
      `Order ${orderHash} details:
      FilledMakerAmount: ${filledMakerTokenAmount.toString()}
      FilledTakerAmount: ${filledTakerTokenAmount.toString()}`
    );

    const existingOrder = await this.getFullOrder(orderHash);
    if (!existingOrder) {
      this.log(
        'debug',
        `Order ${orderHash} from OrderFillMessage does not exist in our orderbook, skipping`
      );
      return;
    }

    this.log('info', `Updating order ${orderHash} in orderbook - got a fill event`);
    const takerTokenRemainingAmount = await this.getRemainingTakerAmount(
      orderHash,
      existingOrder.takerTokenAmount
    );
    this.log(
      'debug',
      `Order ${orderHash} has ${takerTokenRemainingAmount.toString()} remaining to fill`
    );

    const state = takerTokenRemainingAmount.greaterThan(0) ? OrderState.OPEN : OrderState.CLOSED;

    this.updateRemainingTakerTokenAmountForOrderInDatabase(orderHash, takerTokenRemainingAmount);
    this.log(
      'info',
      `Updated ${orderHash} in postgres database. Updated Taker Token Amount to ${takerTokenRemainingAmount.toString()}`
    );

    // emit event
    // throw new Error('finish this part...');
    // const event: Message<OrderbookUpdate> = {
    //   type: 'fill',
    //   channel: 'orderbook',
    //   payload: existingOrder,
    // };
    // this.emit('orderbook:update', event);
  }

  private async updateRemainingTakerTokenAmountForOrderInDatabase(
    orderHash: string,
    remainingTakerTokenAmount: BigNumber
  ) {
    const res = await this.pool.query(SQL`
      UPDATE orders 
      SET taker_token_remaining_amount = ${remainingTakerTokenAmount.toString()}
      WHERE order_hash = ${orderHash};
    `);
    console.log(res);
  }

  private async getRemainingTakerAmount(
    orderHash: string,
    originalTakerTokenAmount: BigNumber
  ): Promise<BigNumber> {
    const takerAmountUnavailable = await this.zeroEx.exchange.getUnavailableTakerAmountAsync(
      orderHash
    );
    const takerAmountRemaining = originalTakerTokenAmount.sub(
      new BigNumber(takerAmountUnavailable)
    );
    return takerAmountRemaining;
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
      remainingTakerTokenAmount: res.rows[0]['remaining_taker_taken_amount'],
    };
    return formattedOrder;
  }

  private validatePostgresInstance() {
    this.pool
      .query(SQL`SELECT to_regclass(${this.orderTableName})`)
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
