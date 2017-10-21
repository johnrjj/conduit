import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as expressLogger from 'morgan';
import * as helmet from 'helmet';
import * as cors from 'cors';
import * as WebSocket from 'ws';
import * as expressWsFactory from 'express-ws';
import * as BigNumber from 'bignumber.js';
import * as ProviderEngine from 'web3-provider-engine';
import * as FilterSubprovider from 'web3-provider-engine/subproviders/filters';
import * as RpcSubprovider from 'web3-provider-engine/subproviders/rpc';
import {
  ZeroEx,
  ExchangeEvents,
  Web3Provider,
  LogFillContractEventArgs,
  LogCancelContractEventArgs,
} from '0x.js';
import v0ApiRouteFactory from './rest-api/routes';
import { WebSocketNode } from './ws-api/websocket-node';
import { Orderbook, PostgresOrderbook, InMemoryOrderbook } from './orderbook';
import { RoutingError, BlockchainLogEvent, OrderbookOrder } from './types/core';
import { ConduitOrderAddEvent, ConduitOrderUpdateEvent, EventTypes } from './types/events';
import { Readable, PassThrough } from 'stream';
import { serializeOrderbookOrder } from './util/order';
import { ConsoleLoggerFactory, Logger } from './util/logger';
import { generateInMemoryDbFromJson } from './util/seed-data';
import { orderbookFactory } from './util/orderbook';
import { Pool, PoolConfig } from 'pg';
import config from './config';

BigNumber.BigNumber.config({
  EXPONENTIAL_AT: 1000,
});

const createApp = async () => {
  const isProduction = config.NODE_ENV === 'production' ? true : false;
  const logger: Logger = ConsoleLoggerFactory({ level: config.LOG_LEVEL });
  const BLOCKCHAIN_NETWORK_ENDPOINT = config.BLOCKCHAIN_NETWORK_ENDPOINT;
  const BLOCKCHAIN_STARTING_BLOCK = config.BLOCKCHAIN_STARTING_BLOCK;
  const ZEROEX_EXCHANGE_SOL_ADDRESS = config.ZERO_EX_EXCHANGE_SOL_ADDRESS;

  const providerEngine = new ProviderEngine();
  providerEngine.addProvider(new FilterSubprovider());
  providerEngine.addProvider(new RpcSubprovider({ rpcUrl: BLOCKCHAIN_NETWORK_ENDPOINT }));
  providerEngine.start();

  const zeroEx = new ZeroEx(providerEngine);
  const orderbook = await orderbookFactory({ config, zeroEx, logger });

  const app = express();
  const expressWs = expressWsFactory(app);
  app.set('trust proxy', true);
  app.use('/', express.static(__dirname + '/public'));
  app.use(expressLogger('dev'));
  app.use(helmet());
  app.use(cors());

  app.get('/healthcheck', (req, res) => {
    res.sendStatus(200);
  });

  app.use('/api/v0', v0ApiRouteFactory(orderbook, zeroEx, logger));

  const wss = expressWs.getWss('/ws');
  // const websocketFeed = new WebSocketFeed({ logger, wss,  });
  // (app as any).ws('/ws', (ws, req, next) => websocketFeed.acceptConnection(ws, req, next));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const err = new RoutingError('Not Found');
    err.status = 404;
    next(err);
  });

  app.use((error: RoutingError | any, req: Request, res: Response, next: NextFunction) => {
    res.status(error.status || 500);
    res.json({ ...error });
  });

  const zeroExStreamWrapper = new PassThrough({
    objectMode: true,
    highWaterMark: 1024,
  });
  zeroEx.exchange
    .subscribeAsync(ExchangeEvents.LogFill, {}, ev => {
      logger.log('debug', 'LogFill received from 0x', ev);
      const logEvent = ev as BlockchainLogEvent;
      (logEvent as any).type = `Blockchain.${ev.event}`;
      zeroExStreamWrapper.push(logEvent);
    })
    .then(cancelToken => {})
    .catch(e => logger.error(e));

  zeroEx.exchange
    .subscribeAsync(ExchangeEvents.LogCancel, {}, ev => {
      logger.log('debug', 'LogCancel received from 0x', ev);
      const logEvent = ev as BlockchainLogEvent;
      (logEvent as any).type = `Blockchain.${ev.event}`;
      zeroExStreamWrapper.push(logEvent);
    })
    .then(cancelToken => {})
    .catch(e => logger.error(e));

  // Feed all relevant event streams into orderbook
  zeroExStreamWrapper.pipe(orderbook);

  // Now we can subscribe to the (standardized) orderbook stream for relevant events
  orderbook.on(EventTypes.CONDUIT_ORDER_ADD, (order: OrderbookOrder) => {});
  orderbook.on(EventTypes.CONDUIT_ORDER_UPDATE, (order: OrderbookOrder) => {});

  return app;
};

export default createApp;
