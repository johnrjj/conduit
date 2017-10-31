import { BigNumber } from 'bignumber.js';
import { Duplex } from 'stream';
import { Pool } from 'pg';
import { SQL } from 'sql-template-strings';
import { ZeroEx, SignedOrder, Token } from '0x.js';
import { RedisClient } from 'redis';
import { PostgresRelayOptions, PostgresOrderModel } from './types';
import { Relay } from '../types';
import { Message, OrderbookUpdate, OrderbookFill, AvailableMessageTypes } from '../../ws-api/types';
import {
  OrderbookPair,
  ZeroExOrderFillEvent,
  ZeroExOrderCancelEvent,
  BlockchainLogEvent,
  TokenPair,
  OrderFilterOptions,
  SerializedSignedOrderWithCurrentBalance,
  SignedOrderWithCurrentBalance,
  FeeQueryRequest,
  FeeQueryResponse,
} from '../../../types';
import { serializeSignedOrder } from '../../../util/order';
import { Logger } from '../../../util/logger';

export class PostgresRelay extends Duplex implements Relay {
  private pool: Pool;
  private orderTableName: string;
  private tokenTableName: string;
  private tokenPairsTableName: string;
  private zeroEx: ZeroEx;
  private redisSubscriber: RedisClient;
  private redisPublisher: RedisClient;
  private logger?: Logger;

  constructor({
    postgresPool,
    orderTableName,
    tokenTableName,
    tokenPairTableName,
    zeroEx,
    redisPublisher,
    redisSubscriber,
    logger,
  }: PostgresRelayOptions) {
    super({ objectMode: true, highWaterMark: 1024 });
    this.pool = postgresPool;
    this.orderTableName = orderTableName || 'orders';
    this.tokenTableName = tokenTableName || 'tokens';
    this.tokenPairsTableName = tokenPairTableName || 'token_pairs';
    this.zeroEx = zeroEx;
    this.redisPublisher = redisPublisher;
    this.redisSubscriber = redisSubscriber;
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

  async getFees(feePayload: FeeQueryRequest): Promise<FeeQueryResponse> {
    const freeFee: FeeQueryResponse = {
      feeRecipient: '0x0000000000000000000000000000000000000000',
      makerFee: '0',
      takerFee: '0',
    };
    return freeFee;
  }

  async postOrder(orderHash: string, signedOrder: SignedOrder): Promise<SignedOrder> {
    const takerTokenRemainingAmount = await this.getRemainingTakerAmount(
      orderHash,
      signedOrder.takerTokenAmount
    );

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
    // publish new order message
    try {
      const channel = 'orderbook';
      const type = 'update';
      const payload: OrderbookUpdate = serializeSignedOrder(signedOrder);

      const { baseToken, quoteToken } = await this.getBaseTokenAndQuoteTokenFromMakerAndTaker(
        signedOrder.takerTokenAddress,
        signedOrder.makerTokenAddress
      );

      const channelHash = `${channel}.${type}:${baseToken}:${quoteToken}`;
      const event: Message<OrderbookUpdate> = {
        channel,
        type,
        payload,
      };
      this.publishMessage(channelHash, event);
    } catch (err) {
      this.log('error', 'Error publishing event to redis', err);
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
        const payload = blockchainFillLog.args as ZeroExOrderFillEvent;
        this.handleOrderFillMessage(blockchainFillLog.args as ZeroExOrderFillEvent);
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

  private async getBaseTokenAndQuoteTokenFromMakerAndTaker(
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

  private async handleOrderFillMessage(fillMessage: ZeroExOrderFillEvent) {
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
    const takerTokenAmountRemaining = await this.getRemainingTakerAmount(
      orderHash,
      existingOrder.takerTokenAmount
    );
    this.log(
      'debug',
      `Order ${orderHash} has ${takerTokenAmountRemaining.toString()} remaining to fill`
    );

    this.updateRemainingTakerTokenAmountForOrderInDatabase(orderHash, filledTakerTokenAmount);
    this.log(
      'info',
      `Updated ${orderHash} in postgres database. Updated Taker Token Amount to ${takerTokenAmountRemaining.toString()}`
    );

    const updatedOrder: SignedOrderWithCurrentBalance = {
      ...existingOrder,
      takerTokenAmountRemaining,
    };

    const { baseToken, quoteToken } = await this.getBaseTokenAndQuoteTokenFromMakerAndTaker(
      updatedOrder.takerTokenAddress,
      updatedOrder.makerTokenAddress
    );

    try {
      const channel = 'orderbook';
      const type = 'fill';
      const payload: OrderbookFill = {
        ...serializeSignedOrder(updatedOrder),
        takerTokenAmountRemaining: takerTokenAmountRemaining.toString(),
        filledMakerTokenAmount: filledMakerTokenAmount.toString(),
        filledTakerTokenAmount: filledTakerTokenAmount.toString(),
      };
      const channelHash = `${channel}.${type}:${baseToken}:${quoteToken}`;
      const event: Message<OrderbookFill> = {
        channel,
        type,
        payload,
      };
      this.publishMessage(channelHash, event);
    } catch (err) {
      this.log('error', 'Error publishing event to redis', err);
    }
  }

  private publishMessage(channel: string, message: AvailableMessageTypes) {
    try {
      const eventString = JSON.stringify(event);
      this.log('verbose', `Publishing event to ${channel}`);
      this.redisPublisher.publish(channel, eventString);
    } catch (err) {
      this.log('error', 'Error publishing event to redis', err);
    }
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
