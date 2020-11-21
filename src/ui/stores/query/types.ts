import { CoinPrimitive } from "../common/types";

export type MintingInflation = {
  height: string;
  // Dec
  result: string;
};

export type StakingPool = {
  height: string;
  result: {
    // Int
    notBondedTokens: string;
    // Int
    bonded_tokens: string;
  };
};

export type SupplyTotal = {
  height: string;
  // Int
  result: string;
};

export type Rewards = {
  height: string;
  result: {
    rewards: DelegatorReward[] | null;
    total: CoinPrimitive[];
  };
};

export type DelegatorReward = {
  validator_address: string;
  reward: CoinPrimitive[] | null;
};

export type Balances = {
  result: CoinPrimitive[];
};
