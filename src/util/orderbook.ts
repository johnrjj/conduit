import { Pool } from 'pg';
import { ZeroEx } from '0x.js';
import { generateInMemoryDbFromJson } from './seed-data';
import { Logger } from './logger';
import { Orderbook, PostgresOrderbook, InMemoryOrderbook } from '../orderbook';
import { AppConfig } from '../config';

// definitely refactor this, super ugly
const orderbookFactory = ({
  config,
  logger,
  zeroEx,
}: {
  config: AppConfig;
  logger: Logger;
  zeroEx: ZeroEx;
}): Orderbook => {
  let orderbook: Orderbook;
  if (config.DATA_STORE === 'postgres') {
    try {
      let pool: Pool;
      if (config.DATABASE_URL) {
        pool = new Pool({
          connectionString: config.DATABASE_URL,
        });
      } else {
        pool = new Pool({
          user: config.PGUSER,
          password: config.PGPASSWORD,
          host: config.PGHOST,
          database: config.PGDATABASE,
          port: config.PGPORT,
        });
      }
      logger.log('debug', `Connecting to Postres Database`);
      orderbook = new PostgresOrderbook({
        postgresPool: pool || '',
        orderTableName: config.PG_ORDERS_TABLE_NAME || '',
        tokenTableName: config.PG_TOKENS_TABLE_NAME || '',
        logger,
      });
    } catch (e) {
      logger.log('error', 'Error connecting to Postgres', e);
      throw e;
    }
  } else {
    logger.log('debug', 'No data store specified, falling back to in-memory');
    logger.log('debug', `Creating In-Memory Database`);
    const initialDb = generateInMemoryDbFromJson(zeroEx);
    orderbook = new InMemoryOrderbook({ zeroEx, logger, initialDb });
  }
  return orderbook;
};

export { orderbookFactory };
