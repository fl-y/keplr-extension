import { Router } from "@keplr/router";
import {
  EnableKeyRingMsg,
  CreateMnemonicKeyMsg,
  CreatePrivateKeyMsg,
  GetKeyMsg,
  UnlockKeyRingMsg,
  RequestSignMsg,
  LockKeyRingMsg,
  DeleteKeyRingMsg,
  ShowKeyRingMsg,
  RequestTxBuilderConfigMsg,
  GetKeyRingTypeMsg,
  AddMnemonicKeyMsg,
  AddPrivateKeyMsg,
  GetMultiKeyStoreInfoMsg,
  ChangeKeyRingMsg,
  CreateLedgerKeyMsg,
  AddLedgerKeyMsg,
  GetKeyStoreBIP44SelectablesMsg,
  GetIsKeyStoreCoinTypeSetMsg,
  SetKeyStoreCoinTypeMsg,
  RestoreKeyRingMsg,
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { KeyRingKeeper } from "./keeper";

export function init(router: Router, keeper: KeyRingKeeper): void {
  router.registerMessage(RestoreKeyRingMsg);
  router.registerMessage(EnableKeyRingMsg);
  router.registerMessage(DeleteKeyRingMsg);
  router.registerMessage(ShowKeyRingMsg);
  router.registerMessage(CreateMnemonicKeyMsg);
  router.registerMessage(AddMnemonicKeyMsg);
  router.registerMessage(CreatePrivateKeyMsg);
  router.registerMessage(AddPrivateKeyMsg);
  router.registerMessage(CreateLedgerKeyMsg);
  router.registerMessage(AddLedgerKeyMsg);
  router.registerMessage(LockKeyRingMsg);
  router.registerMessage(UnlockKeyRingMsg);
  router.registerMessage(GetKeyMsg);
  router.registerMessage(RequestTxBuilderConfigMsg);
  router.registerMessage(RequestSignMsg);
  router.registerMessage(GetKeyRingTypeMsg);
  router.registerMessage(GetMultiKeyStoreInfoMsg);
  router.registerMessage(ChangeKeyRingMsg);
  router.registerMessage(GetKeyStoreBIP44SelectablesMsg);
  router.registerMessage(GetIsKeyStoreCoinTypeSetMsg);
  router.registerMessage(SetKeyStoreCoinTypeMsg);

  router.addHandler(ROUTE, getHandler(keeper));
}
