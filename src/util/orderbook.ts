import { Pool } from 'pg';
import { ZeroEx } from '0x.js';
import { generateInMemoryDbFromJson } from './seed-data';
import { Logger } from './logger';
import { Orderbook, PostgresOrderbook, InMemoryOrderbook } from '../orderbook';
import { AppConfig } from '../config';

// definitely refactor this asap...
const orderbookFactory = async ({
  config,
  logger,
  zeroEx,
}: {
  config: AppConfig;
  logger: Logger;
  zeroEx: ZeroEx;
}): Promise<Orderbook> => {
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
      orderbook = new PostgresOrderbook({
        postgresPool: pool || '',
        orderTableName: config.PG_ORDERS_TABLE_NAME || '',
        tokenTableName: config.PG_TOKENS_TABLE_NAME || '',
        tokenPairTableName: config.PG_TOKEN_PAIRS_TABLE_NAME || '',
        logger,
      });
      await pool.connect();
      logger.log('info', `Connected to Postres Database`);
    } catch (e) {
      logger.log('error', 'Error connecting to Postgres', e);
      logger.log('debug', `Gracefully degrading into In-Memory Database`);
      const initialDb = generateInMemoryDbFromJson(zeroEx);
      orderbook = new InMemoryOrderbook({ zeroEx, logger, initialDb });
      logger.log('info', 'Connected to In-Memory Database');
    }
  } else {
    logger.log('debug', 'No data store specified, falling back to in-memory');
    logger.log('info', `Creating In-Memory Database`);
    const initialDb = generateInMemoryDbFromJson(zeroEx);
    orderbook = new InMemoryOrderbook({ zeroEx, logger, initialDb });
  }
  return orderbook;
};

export { orderbookFactory };
