import { ZeroEx, Token } from '0x.js';
import { Relay } from '../modules/clients/types';

// O(n^2)
const pairTokens = (arr: Array<Token>): Array<Array<string>> => {
  let accum: Array<Array<string>> = [];
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const tokenA = arr[i];
      const tokenB = arr[j];
      accum.push([tokenA.address, tokenB.address]);
    }
  }
  return accum;
};

const generateTokens = async (zeroEx: ZeroEx) => await zeroEx.tokenRegistry.getTokensAsync();

const generateTokenPairsFromTokens = (tokens: Array<Token>) => pairTokens(tokens);

const generateWethQuotePairsOnly = (tokens: Array<Token>): Array<Array<string>> => {
  const wethTokenIdx = tokens.findIndex(t => t.symbol.toUpperCase() === 'WETH');
  const wethToken = tokens[wethTokenIdx];
  const tokensExceptWeth = [...tokens.slice(0, wethTokenIdx), ...tokens.slice(wethTokenIdx + 1)];
  const tokenPairsWithWethAsQuote = tokensExceptWeth.map(t => [t.address, wethToken.address]);
  return tokenPairsWithWethAsQuote;
};

const populateTokenTable = async (db: Relay, zeroEx: ZeroEx) => {
  const tokens = await generateTokens(zeroEx);
  await Promise.all(tokens.map(db.addToken.bind(db)));
};

const populateTokenPairTable = async (db: Relay, zeroEx: ZeroEx) => {
  const tokens = await generateTokens(zeroEx);
  const tokenPairs = generateTokenPairsFromTokens(tokens);
  await Promise.all(
    tokenPairs.map(([baseToken, quoteToken]) => db.addTokenPair(baseToken, quoteToken))
  );
};

const populateTokenPairTableWithOnlyWethAsQuote = async (db: Relay, zeroEx: ZeroEx) => {
  const tokens = await generateTokens(zeroEx);
  const tokenPairsWithWethAsQuote = generateWethQuotePairsOnly(tokens);
  await Promise.all(
    tokenPairsWithWethAsQuote.map(([baseToken, quoteToken]) =>
      db.addTokenPair(baseToken, quoteToken)
    )
  );
};

const populateDatabase = async (relayDatabase, zeroEx, logger) => {
  logger.log('debug', 'Populating Postgres database with data (First time config)');
  // soft fail, will continue if populates fail.
  try {
    const tokenInsertRes = await populateTokenTable(relayDatabase as Relay, zeroEx);
    logger.log('debug', `Populated token table successfully`);
  } catch (e) {
    logger.log('error', `Error inserting tokens into postgres token table`, e);
  }
  try {
    const tokenPairInsertRes = await populateTokenPairTable(relayDatabase as Relay, zeroEx);
    logger.log('debug', `Populated token pair table successfully`);
  } catch (e) {
    logger.log('error', `Error inserting tokenpairs into postgres token pair table`, e);
  }
};

export {
  generateTokens,
  generateTokenPairsFromTokens,
  populateTokenTable,
  populateTokenPairTable,
  populateDatabase,
  populateTokenPairTableWithOnlyWethAsQuote,
};
