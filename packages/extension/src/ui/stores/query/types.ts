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
  height: string;
  result: CoinPrimitive[];
};

export type Delegations = {
  height: string;
  result: Delegation[];
};

export type Delegation = {
  delegator_address: string;
  validator_address: string;
  // Dec
  shares: string;
  // Int
  balance:
    | string
    // There is difference according to the cosmos-sdk's version.
    // But, latter is the latest version.
    | {
        denom: string;
        amount: string;
      };
};

export type UnbondingDelegations = {
  height: string;
  result: UnbondingDelegation[];
};

export type UnbondingDelegation = {
  delegator_address: string;
  validator_address: string;
  entries: [
    {
      creation_height: string;
      completion_time: string;
      initial_balance: string;
      balance: string;
    }
  ];
};
