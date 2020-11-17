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
