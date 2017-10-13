import { LogFillContractEventArgs } from '0x.js';
// import { LogEvent } from '0x.js'; not exported?!

export interface LogEvent {
  address: string;
  args: any;
  blockHash: string | null;
  blockNumber: number | null;
  data: string;
  event: string;
  logIndex: number | null;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: number;
}

export type BlockchainLogEvent = LogEvent;
export type OrderFillMessage = LogFillContractEventArgs;
