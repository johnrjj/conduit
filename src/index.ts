import app from './app';
const PORT = 3000;

process.on('unhandledRejection', (reason, p) => {
  console.log(
    'Possibly Unhandled Rejection at: Promise ',
    p,
    ' reason: ',
    reason
  );
});

const start = () =>
  app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
  });

start();
