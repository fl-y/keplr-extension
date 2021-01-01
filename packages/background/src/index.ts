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

import { BrowserKVStore } from "@keplr/common";
import { ChainInfo } from "@keplr/types";
import { AccessOrigin } from "./chains";

export function init(
  router: Router,
  embedChainInfos: ChainInfo[],
  embedAccessOrigins: AccessOrigin[]
) {
  const interactionKeeper = new Interaction.InteractionKeeper();
  Interaction.init(router, interactionKeeper);

  const persistentMemory = new PersistentMemory.PersistentMemoryKeeper();
  PersistentMemory.init(router, persistentMemory);

  const chainUpdaterKeeper = new Updater.ChainUpdaterKeeper(
    new BrowserKVStore("updater")
  );

  const tokensKeeper = new Tokens.TokensKeeper(
    new BrowserKVStore("tokens"),
    interactionKeeper
  );
  Tokens.init(router, tokensKeeper);

  const chainsKeeper = new Chains.ChainsKeeper(
    new BrowserKVStore("chains"),
    chainUpdaterKeeper,
    tokensKeeper,
    interactionKeeper,
    embedChainInfos,
    embedAccessOrigins
  );
  Chains.init(router, chainsKeeper);

  const ledgerKeeper = new Ledger.LedgerKeeper(
    new BrowserKVStore("ledger"),
    interactionKeeper
  );
  Ledger.init(router, ledgerKeeper);

  const keyRingKeeper = new KeyRing.KeyRingKeeper(
    embedChainInfos,
    new BrowserKVStore("keyring"),
    interactionKeeper,
    chainsKeeper,
    ledgerKeeper
  );
  KeyRing.init(router, keyRingKeeper);

  tokensKeeper.init(chainsKeeper, keyRingKeeper);

  const secretWasmKeeper = new SecretWasm.SecretWasmKeeper(
    new BrowserKVStore("secretwasm"),
    chainsKeeper,
    keyRingKeeper
  );
  SecretWasm.init(router, secretWasmKeeper);

  const backgroundTxKeeper = new BackgroundTx.BackgroundTxKeeper(chainsKeeper);
  BackgroundTx.init(router, backgroundTxKeeper);
}
