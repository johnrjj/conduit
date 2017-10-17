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
import { ZeroEx, ExchangeEvents, Web3Provider, LogFillContractEventArgs } from '0x.js';
import v0ApiRouteFactory from './api/routes';
import { WebSocketFeed } from './websocket';
import { Orderbook, InMemoryOrderbook } from './orderbook';
import { RoutingError, BlockchainLogEvent, OrderbookOrder } from './types/core';
import { ConduitOrderAddMessage, ConduitOrderUpdateMessage, MessageTypes } from './types/messages';
import { Readable, PassThrough } from 'stream';
import { ConsoleLoggerFactory, Logger } from './util/logger';
import { generateInMemoryDbFromJson } from './util/seed-data';

BigNumber.BigNumber.config({
  EXPONENTIAL_AT: 1000,
});

const logger: Logger = ConsoleLoggerFactory({ level: 'debug' });

const KOVAN_ENDPOINT = 'https://kovan.infura.io';
const KOVAN_STARTING_BLOCK = 3117574;
const KOVAN_0X_EXCHANGE_SOL_ADDRESS = '0x90fe2af704b34e0224bf2299c838e04d4dcf1364';

const providerEngine = new ProviderEngine();
providerEngine.addProvider(new FilterSubprovider());
providerEngine.addProvider(new RpcSubprovider({ rpcUrl: KOVAN_ENDPOINT }));
providerEngine.start();

const zeroEx = new ZeroEx(providerEngine);

// temporary
const initialDb = generateInMemoryDbFromJson(zeroEx);
const orderbook: Orderbook = new InMemoryOrderbook({ zeroEx, logger, initialDb });

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
const websocketFeed = new WebSocketFeed({ logger, wss });
(app as any).ws('/ws', (ws, req, next) => websocketFeed.acceptConnection(ws, req, next));

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
    const args = ev.args as LogFillContractEventArgs;
    (logEvent as any).type = `Blockchain.${ev.event}`;
    zeroExStreamWrapper.push(ev);
  })
  .then(cancelToken => {})
  .catch(e => logger.error(e));

// Feed all relevant event streams into orderbook
zeroExStreamWrapper.pipe(orderbook);

// Now we can subscribe to the (standardized) orderbook stream for relevant events
orderbook.on(MessageTypes.CONDUIT_ORDER_ADD, (order: OrderbookOrder) => {
  console.log('Order added to orderbook', order);
  websocketFeed.broadcast(JSON.stringify(order));

  /*...*/
});
orderbook.on(MessageTypes.CONDUIT_ORDER_UPDATE, (order: OrderbookOrder) => {
  console.log('Order updated on orderbook', order);
  websocketFeed.broadcast(JSON.stringify(order));
  /*...*/
});

export default app;
