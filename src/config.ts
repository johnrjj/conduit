export interface AppConfig {
  PORT?: number;
  NODE_ENV?: string;
  LOG_LEVEL?: string;
  BLOCKCHAIN_NETWORK_ENDPOINT?: string;
  BLOCKCHAIN_STARTING_BLOCK?: string;
  ZERO_EX_EXCHANGE_SOL_ADDRESS?: string;
  DATA_STORE?: string;
  DATABASE_URL?: string;
  PGUSER?: string;
  PGHOST?: string;
  PGPASSWORD?: string;
  PGDATABASE?: string;
  PGPORT?: number;
  PG_ORDERS_TABLE_NAME?: string;
  PG_TOKENS_TABLE_NAME?: string;
  PG_APP_TABLE_NAME?: string;
}

const config: AppConfig = {
  PORT: parseInt(process.env.PORT || '', 10) || 3001,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  BLOCKCHAIN_NETWORK_ENDPOINT: process.env.BLOCKCHAIN_NETWORK_ENDPOINT || 'https://kovan.infura.io',
  BLOCKCHAIN_STARTING_BLOCK: process.env.BLOCKCHAIN_NETWORK_ENDPOINT || 'latest',
  ZERO_EX_EXCHANGE_SOL_ADDRESS:
    process.env.ZERO_EX_EXCHANGE_SOL_ADDRESS || '0x90fe2af704b34e0224bf2299c838e04d4dcf1364',
  DATA_STORE: process.env.DATA_STORE || 'postgres',
  DATABASE_URL: process.env.DATABASE_URL,
  PGUSER: process.env.PGUSER || 'johnjohnson',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPASSWORD: process.env.PGPASSWORD,
  PGDATABASE: 'zeroex',
  PGPORT: parseInt(process.env.PGPORT || '', 10) || 5432,
  PG_ORDERS_TABLE_NAME: 'orders',
  PG_TOKENS_TABLE_NAME: 'tokens',
  PG_APP_TABLE_NAME: 'app',
};

export default config;
