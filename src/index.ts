import app from './app';
const PORT = 3001;

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

const start = () =>
  app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
  });

setupProcessCleanup();
start();
