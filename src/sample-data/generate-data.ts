import { ZeroEx, Token } from '0x.js';
import { PostgresRelayDatabase } from '../modules/relay/postgres-relay';

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

const populateTokenTable = async (db: PostgresRelayDatabase, zeroEx: ZeroEx) => {
  const tokens = await generateTokens(zeroEx);
  await Promise.all(tokens.map(db.addToken.bind(db)));
};

const populateTokenPairTable = async (db: PostgresRelayDatabase, zeroEx: ZeroEx) => {
  const tokens = await generateTokens(zeroEx);
  const tokenPairs = generateTokenPairsFromTokens(tokens);
  await Promise.all(
    tokenPairs.map(([baseToken, quoteToken]) => db.addTokenPair(baseToken, quoteToken))
  );
};

export { generateTokens, generateTokenPairsFromTokens, populateTokenTable, populateTokenPairTable };
