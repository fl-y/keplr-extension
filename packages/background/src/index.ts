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
import * as Permission from "./permission/internal";

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
  const interactionService = new Interaction.InteractionService();
  Interaction.init(router, interactionService);

  const persistentMemory = new PersistentMemory.PersistentMemoryService();
  PersistentMemory.init(router, persistentMemory);

  const permissionService = new Permission.PermissionService(
    storeCreator("permission"),
    interactionService
  );
  Permission.init(router, permissionService);

  const chainUpdaterService = new Updater.ChainUpdaterService(
    storeCreator("updater")
  );

  const tokensService = new Tokens.TokensService(
    storeCreator("tokens"),
    interactionService
  );
  Tokens.init(router, tokensService);

  const chainsService = new Chains.ChainsService(
    storeCreator("chains"),
    chainUpdaterService,
    tokensService,
    interactionService,
    embedChainInfos,
    embedAccessOrigins
  );
  Chains.init(router, chainsService);

  const ledgerService = new Ledger.LedgerService(
    storeCreator("ledger"),
    interactionService
  );
  Ledger.init(router, ledgerService);

  const keyRingService = new KeyRing.KeyRingService(
    embedChainInfos,
    storeCreator("keyring"),
    interactionService,
    chainsService,
    ledgerService
  );
  KeyRing.init(router, keyRingService);

  tokensService.init(chainsService, keyRingService);

  const secretWasmService = new SecretWasm.SecretWasmService(
    storeCreator("secretwasm"),
    chainsService,
    keyRingService
  );
  SecretWasm.init(router, secretWasmService);

  const backgroundTxService = new BackgroundTx.BackgroundTxService(
    chainsService
  );
  BackgroundTx.init(router, backgroundTxService);
}
