import { Router } from "@keplr/router";

import * as PersistentMemory from "./persistent-memory/internal";
import * as Chains from "./chains/internal";
import * as Ledger from "./ledger/internal";
import * as KeyRing from "./keyring/internal";
import * as SecretWasm from "./secret-wasm/internal";
import * as BackgroundTx from "./tx/internal";
import * as Updater from "./updater/internal";
import * as Tokens from "./tokens/internal";
import * as Interaction from "./interaction/internal";

export * from "./persistent-memory";
export * from "./chains";
export * from "./ledger";
export * from "./keyring";
export * from "./secret-wasm";
export * from "./tx";
export * from "./updater";
export * from "./tokens";
export * from "./interaction";

import { KVStore } from "@keplr/common";
import { ChainInfo } from "@keplr/types";
import { AccessOrigin } from "./chains";

export function init(
  router: Router,
  storeCreator: (prefix: string) => KVStore,
  embedChainInfos: ChainInfo[],
  embedAccessOrigins: AccessOrigin[]
) {
  const interactionKeeper = new Interaction.InteractionKeeper();
  Interaction.init(router, interactionKeeper);

  const persistentMemory = new PersistentMemory.PersistentMemoryKeeper();
  PersistentMemory.init(router, persistentMemory);

  const chainUpdaterKeeper = new Updater.ChainUpdaterKeeper(
    storeCreator("updater")
  );

  const tokensKeeper = new Tokens.TokensKeeper(
    storeCreator("tokens"),
    interactionKeeper
  );
  Tokens.init(router, tokensKeeper);

  const chainsKeeper = new Chains.ChainsKeeper(
    storeCreator("chains"),
    chainUpdaterKeeper,
    tokensKeeper,
    interactionKeeper,
    embedChainInfos,
    embedAccessOrigins
  );
  Chains.init(router, chainsKeeper);

  const ledgerKeeper = new Ledger.LedgerKeeper(
    storeCreator("ledger"),
    interactionKeeper
  );
  Ledger.init(router, ledgerKeeper);

  const keyRingKeeper = new KeyRing.KeyRingKeeper(
    embedChainInfos,
    storeCreator("keyring"),
    interactionKeeper,
    chainsKeeper,
    ledgerKeeper
  );
  KeyRing.init(router, keyRingKeeper);

  tokensKeeper.init(chainsKeeper, keyRingKeeper);

  const secretWasmKeeper = new SecretWasm.SecretWasmKeeper(
    storeCreator("secretwasm"),
    chainsKeeper,
    keyRingKeeper
  );
  SecretWasm.init(router, secretWasmKeeper);

  const backgroundTxKeeper = new BackgroundTx.BackgroundTxKeeper(chainsKeeper);
  BackgroundTx.init(router, backgroundTxKeeper);
}
