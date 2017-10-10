import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as logger from 'morgan';
import * as helmet from 'helmet';
import * as cors from 'cors';
import * as BigNumber from 'bignumber.js';

// 0x related
import ProviderEngine = require('web3-provider-engine');
import FilterSubprovider = require('web3-provider-engine/subproviders/filters');
import RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
import { ZeroEx, ExchangeEvents } from '0x.js';

// api routes
import v0Api from './api/routes';

BigNumber.BigNumber.config({
  EXPONENTIAL_AT: 1000,
});

const KOVAN_ENDPOINT = 'https://kovan.infura.io';
const KOVAN_STARTING_BLOCK = 3117574;
const KOVAN_0X_EXCHANGE_SOL_ADDRESS =
  '0x90fe2af704b34e0224bf2299c838e04d4dcf1364';

// const providerEngine = new ProviderEngine();
// providerEngine.addProvider(new FilterSubprovider());
// providerEngine.addProvider(new RpcSubprovider({ rpcUrl: KOVAN_ENDPOINT }));
// providerEngine.start();
// const zeroEx = new ZeroEx(providerEngine);

// 0X Test
// const tokens = zeroEx.tokenRegistry
//   .getTokensAsync()
//   .then(x => console.log(x))
//   .catch(e => console.error('error getting token registry', e));

// zeroEx
//   .getAvailableAddressesAsync()
//   .then(function(availableAddresses) {
//     console.log(availableAddresses);
//   })
//   .catch(function(error) {
//     console.log('error getting available addresses', error);
//   });

// zeroEx.exchange
//   .subscribeAsync(
//     ExchangeEvents.LogFill,
//     { fromBlock: 4227326, toBlock: 'latest' },
//     {},
//     KOVAN_0X_EXCHANGE_SOL_ADDRESS
//   )
//   .then(emitter =>
//     emitter.watch((e, ev) => {
//       console.log(e, ev);
//     })
//   )
//   .catch(e => console.log('event log error', e));

const app = express();

app.set('trust proxy', true);
app.use('/', express.static(__dirname + '/public'));
app.use(logger('dev'));
app.use(helmet());
app.use(cors());

app.get('/healthcheck', (req, res) => {
  res.sendStatus(200);
});

app.use('/api/v0', v0Api);

app.use((req: Request, res: Response, next: NextFunction) => {
  const err = new Error('Not Found');
  req.statusCode = 404;
  next(err);
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  res.status(error.status || 500);
  res.json({
    message: error.message,
    error,
  });
});

export default app;
