import createApp from './app';
import config from './config';
const PORT = config.PORT;

const setupProcessCleanup = () => {
  process.on('exit', () => {
    (process as NodeJS.EventEmitter).emit('cleanup');
  });
  process.on('SIGINT', () => {
    console.log('ctrl-c');
    process.exit(2);
  });
  process.on('uncaughtException', e => {
    console.log('Uncaught Exception...');
    console.log(e.stack);
    process.exit(99);
  });
  process.on('unhandledRejection', (reason, p) => {
    console.log('Possibly Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  });
};

const start = async () => {
  try {
    const app = await createApp();
    app.listen(PORT), () => console.log(`Running on port ${PORT}`);
  } catch (e) {
    console.error('Error starting app', e);
  }
};

setupProcessCleanup();
start();
