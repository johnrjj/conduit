import { ZeroEx, Token } from '0x.js';
import { OrderApiPayload, TokenPair } from '../types/0x-spec';

const pairTokens = (arr: Array<Token>) => {
  let accum: Array<TokenPair> = [];
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const tokenA = arr[i];
      const tokenB = arr[j];
      const o = {
        [tokenA.name]: tokenA,
        [tokenB.name]: tokenB,
      };
      accum.push(o);
    }
  }
  return accum;
};

export { pairTokens };
