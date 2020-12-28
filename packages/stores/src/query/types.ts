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

export type Validator = {
  operator_address: string;
  consensus_pubkey: string;
  jailed: boolean;
  status: number;
  tokens: string;
  delegator_shares: string;
  description: {
    moniker: string;
    identity: string;
    website: string;
    details: string;
  };
  unbonding_height: string;
  unbonding_time: string;
  commission: {
    commission_rates: {
      // Dec
      rate: string;
      // Dec
      max_rate: string;
      // Dec
      max_change_rate: string;
    };
    update_time: string;
  };
  // Int
  min_self_delegation: string;
};

export type Validators = {
  height: string;
  result: Validator[];
};

export enum BondStatus {
  Unbonded = "Unbonded",
  Unbonding = "Unbonding",
  Bonded = "Bonded"
}

export type StakingParams = {
  height: string;
  result: {
    unbonding_time: string;
    max_validators: number;
    max_entries: number;
    bond_denom: string;
  };
};

export type Tally = {
  // Int
  yes: string;
  abstain: string;
  no: string;
  no_with_veto: string;
};

export type ProposalTally = {
  height: string;
  result: Tally;
};

export type Proposal = {
  content: {
    type: string;
    value: {
      title: string;
      description: string;
    };
  };
  // Int
  id: string;
  proposal_status: string;
  final_tally_result: Tally;
  submit_time: string;
  deposit_end_time: string;
  total_deposit: [
    {
      denom: string;
      // Int
      amount: string;
    }
  ];
  voting_start_time: string;
  voting_end_time: string;
};

export type GovProposals = {
  height: string;
  result: Proposal[];
};

export type GovParamsDeposit = {
  height: string;
  result: {
    min_deposit: [
      {
        denom: string;
        amount: string;
      }
    ];
    max_deposit_period: string;
  };
};

export type GovParamsVoting = {
  height: string;
  result: {
    voting_period: string;
  };
};

export type GovParamsTally = {
  height: string;
  result: {
    // Dec
    quorum: string;
    threshold: string;
    veto: string;
  };
};
