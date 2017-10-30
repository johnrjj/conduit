import { RedisClient } from 'redis';
import { Pool } from 'pg';
import { ZeroEx } from '0x.js';
import { Logger } from '../../../util/logger';

export interface PostgresRelayOptions {
  postgresPool: Pool;
  orderTableName: string;
  tokenTableName: string;
  tokenPairTableName: string;
  zeroEx: ZeroEx;
  logger?: Logger;
  redisSubscriber: RedisClient;
  redisPublisher: RedisClient;
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
