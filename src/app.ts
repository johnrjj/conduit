import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as expressLogger from 'morgan';
import * as helmet from 'helmet';
import * as cors from 'cors';
import { Server } from 'http';
import * as openSocket from 'socket.io';
import * as BigNumber from 'bignumber.js';
import * as ProviderEngine from 'web3-provider-engine';
import * as FilterSubprovider from 'web3-provider-engine/subproviders/filters';
import * as RpcSubprovider from 'web3-provider-engine/subproviders/rpc';
import {
  ZeroEx,
  ExchangeEvents,
  Web3Provider,
  LogFillContractEventArgs,
} from '0x.js';
import v0ApiRouteFactory from './api/routes';
import { Repository, InMemoryRepository } from './repositories';
import { Readable, PassThrough } from 'stream';
import { ConsoleLoggerFactory, Logger } from './util/logger';
BigNumber.BigNumber.config({
  EXPONENTIAL_AT: 1000,
});

const logger: Logger = ConsoleLoggerFactory({ level: 'debug' });

const KOVAN_ENDPOINT = 'https://kovan.infura.io';
const KOVAN_STARTING_BLOCK = 3117574;
const KOVAN_0X_EXCHANGE_SOL_ADDRESS =
  '0x90fe2af704b34e0224bf2299c838e04d4dcf1364';

// temporary
const repo: Repository = new InMemoryRepository({ logger });

const providerEngine = new ProviderEngine();
providerEngine.addProvider(new FilterSubprovider());
providerEngine.addProvider(new RpcSubprovider({ rpcUrl: KOVAN_ENDPOINT }));
providerEngine.start();

const zeroEx = new ZeroEx(providerEngine);

const app = express();
app.set('trust proxy', true);
app.use('/', express.static(__dirname + '/public'));
app.use(expressLogger('dev'));
app.use(helmet());
app.use(cors());

app.get('/healthcheck', (req, res) => {
  res.sendStatus(200);
});

app.use('/api/v0', v0ApiRouteFactory(repo, zeroEx, logger));

app.use((req: Request, res: Response, next: NextFunction) => {
  const err = new Error('Not Found');
  req.statusCode = 404;
  next(err);
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  res.status(error.status || 500);
  res.json({
    ...error,
  });
});

const server = new Server(app);
const io = openSocket(server);
io.on('connection', socket => {
  socket.broadcast.emit('user connected');
});

const zeroExStream = new PassThrough({
  objectMode: true,
  highWaterMark: 1024,
});
zeroEx.exchange
  .subscribeAsync(
    ExchangeEvents.LogFill,
    { fromBlock: 'latest', toBlock: 'latest' },
    {},
    KOVAN_0X_EXCHANGE_SOL_ADDRESS
  )
  .then(emitter =>
    emitter.watch((e, ev) => {
      const args = ev.args as LogFillContractEventArgs;
      ev.type = `Blockchain.${ev.event}`;
      zeroExStream.push(ev);
      io.emit('order-fill-from-node', JSON.stringify(ev));
    })
  )
  .catch(e => logger.error(e));
zeroExStream.pipe(repo);

export { server, app };
