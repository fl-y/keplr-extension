import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import {
  EnableKeyRingMsg,
  CreateMnemonicKeyMsg,
  CreatePrivateKeyMsg,
  GetKeyMsg,
  UnlockKeyRingMsg,
  RequestSignMsg,
  LockKeyRingMsg,
  DeleteKeyRingMsg,
  RequestTxBuilderConfigMsg,
  ShowKeyRingMsg,
  GetKeyRingTypeMsg,
  AddMnemonicKeyMsg,
  AddPrivateKeyMsg,
  GetMultiKeyStoreInfoMsg,
  ChangeKeyRingMsg,
  AddLedgerKeyMsg,
  CreateLedgerKeyMsg,
  GetKeyStoreBIP44SelectablesMsg,
  SetKeyStoreCoinTypeMsg
} from "./messages";
import { KeyRingKeeper } from "./keeper";
import { Bech32Address } from "@keplr/cosmos";

const Buffer = require("buffer/").Buffer;

export const getHandler: (keeper: KeyRingKeeper) => Handler = (
  keeper: KeyRingKeeper
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case EnableKeyRingMsg:
        return handleEnableKeyRingMsg(keeper)(env, msg as EnableKeyRingMsg);
      case DeleteKeyRingMsg:
        return handleDeleteKeyRingMsg(keeper)(env, msg as DeleteKeyRingMsg);
      case ShowKeyRingMsg:
        return handleShowKeyRingMsg(keeper)(env, msg as ShowKeyRingMsg);
      case CreateMnemonicKeyMsg:
        return handleCreateMnemonicKeyMsg(keeper)(
          env,
          msg as CreateMnemonicKeyMsg
        );
      case AddMnemonicKeyMsg:
        return handleAddMnemonicKeyMsg(keeper)(env, msg as AddMnemonicKeyMsg);
      case CreatePrivateKeyMsg:
        return handleCreatePrivateKeyMsg(keeper)(
          env,
          msg as CreatePrivateKeyMsg
        );
      case AddPrivateKeyMsg:
        return handleAddPrivateKeyMsg(keeper)(env, msg as AddPrivateKeyMsg);
      case CreateLedgerKeyMsg:
        return handleCreateLedgerKeyMsg(keeper)(env, msg as CreateLedgerKeyMsg);
      case AddLedgerKeyMsg:
        return handleAddLedgerKeyMsg(keeper)(env, msg as AddLedgerKeyMsg);
      case LockKeyRingMsg:
        return handleLockKeyRingMsg(keeper)(env, msg as LockKeyRingMsg);
      case UnlockKeyRingMsg:
        return handleUnlockKeyRingMsg(keeper)(env, msg as UnlockKeyRingMsg);
      case GetKeyMsg:
        return handleGetKeyMsg(keeper)(env, msg as GetKeyMsg);
      case RequestTxBuilderConfigMsg:
        return handleRequestTxBuilderConfigMsg(keeper)(
          env,
          msg as RequestTxBuilderConfigMsg
        );
      case RequestSignMsg:
        return handleRequestSignMsg(keeper)(env, msg as RequestSignMsg);
      case GetKeyRingTypeMsg:
        return handleGetKeyRingTypeMsg(keeper)(env, msg as GetKeyRingTypeMsg);
      case GetMultiKeyStoreInfoMsg:
        return handleGetMultiKeyStoreInfoMsg(keeper)(
          env,
          msg as GetMultiKeyStoreInfoMsg
        );
      case ChangeKeyRingMsg:
        return handleChangeKeyRingMsg(keeper)(env, msg as ChangeKeyRingMsg);
      case SetKeyStoreCoinTypeMsg:
        return handleSetKeyRingCoinTypeMsg(keeper)(
          env,
          msg as SetKeyStoreCoinTypeMsg
        );
      case GetKeyStoreBIP44SelectablesMsg:
        return handleGetKeyStoreBIP44SelectablesMsg(keeper)(
          env,
          msg as GetKeyStoreBIP44SelectablesMsg
        );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleEnableKeyRingMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<EnableKeyRingMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);

    // Will throw an error if chain is unknown.
    await keeper.chainsKeeper.getChainInfo(msg.chainId);

    return {
      status: await keeper.enable(env)
    };
  };
};

const handleDeleteKeyRingMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<DeleteKeyRingMsg> = keeper => {
  return async (_, msg) => {
    return await keeper.deleteKeyRing(msg.index, msg.password);
  };
};

const handleShowKeyRingMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<ShowKeyRingMsg> = keeper => {
  return async (_, msg) => {
    return await keeper.showKeyRing(msg.index, msg.password);
  };
};

const handleCreateMnemonicKeyMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<CreateMnemonicKeyMsg> = keeper => {
  return async (_, msg) => {
    return {
      status: await keeper.createMnemonicKey(
        msg.mnemonic,
        msg.password,
        msg.meta,
        msg.bip44HDPath
      )
    };
  };
};

const handleAddMnemonicKeyMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<AddMnemonicKeyMsg> = keeper => {
  return async (_, msg) => {
    return await keeper.addMnemonicKey(msg.mnemonic, msg.meta, msg.bip44HDPath);
  };
};

const handleCreatePrivateKeyMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<CreatePrivateKeyMsg> = keeper => {
  return async (_, msg) => {
    return {
      status: await keeper.createPrivateKey(
        Buffer.from(msg.privateKeyHex, "hex"),
        msg.password,
        msg.meta
      )
    };
  };
};

const handleAddPrivateKeyMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<AddPrivateKeyMsg> = keeper => {
  return async (_, msg) => {
    return await keeper.addPrivateKey(
      Buffer.from(msg.privateKeyHex, "hex"),
      msg.meta
    );
  };
};

const handleCreateLedgerKeyMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<CreateLedgerKeyMsg> = keeper => {
  return async (env, msg) => {
    return {
      status: await keeper.createLedgerKey(
        env,
        msg.password,
        msg.meta,
        msg.bip44HDPath
      )
    };
  };
};

const handleAddLedgerKeyMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<AddLedgerKeyMsg> = keeper => {
  return async (env, msg) => {
    return await keeper.addLedgerKey(env, msg.meta, msg.bip44HDPath);
  };
};

const handleLockKeyRingMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<LockKeyRingMsg> = keeper => {
  return () => {
    return {
      status: keeper.lock()
    };
  };
};

const handleUnlockKeyRingMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<UnlockKeyRingMsg> = keeper => {
  return async (_, msg) => {
    return {
      status: await keeper.unlock(msg.password)
    };
  };
};

const handleGetKeyMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<GetKeyMsg> = keeper => {
  return async (env, msg) => {
    const getKeyMsg = msg as GetKeyMsg;
    await keeper.checkAccessOrigin(env, getKeyMsg.chainId, getKeyMsg.origin);

    const key = await keeper.getKey(getKeyMsg.chainId);

    return {
      name: keeper.getKeyStoreMeta("name"),
      algo: "secp256k1",
      pubKeyHex: Buffer.from(key.pubKey).toString("hex"),
      addressHex: Buffer.from(key.address).toString("hex"),
      bech32Address: new Bech32Address(key.address).toBech32(
        (await keeper.chainsKeeper.getChainInfo(getKeyMsg.chainId)).bech32Config
          .bech32PrefixAccAddr
      )
    };
  };
};

const handleRequestTxBuilderConfigMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<RequestTxBuilderConfigMsg> = keeper => {
  return async (env, msg) => {
    // `config` in msg can't be null because `validateBasic` ensures that `config` is not null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await keeper.checkAccessOrigin(
      env,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      msg.config!.chainId,
      msg.origin
    );

    const config = await keeper.requestTxBuilderConfig(
      env,
      // `config` in msg can't be null because `validateBasic` ensures that `config` is not null.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      msg.config!,
      msg.skipApprove
    );
    return {
      config
    };
  };
};

const handleRequestSignMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<RequestSignMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);

    await keeper.checkBech32Address(msg.chainId, msg.bech32Address);

    return {
      signatureHex: Buffer.from(
        await keeper.requestSign(
          env,
          msg.chainId,
          new Uint8Array(Buffer.from(msg.messageHex, "hex")),
          msg.skipApprove
        )
      ).toString("hex")
    };
  };
};

const handleGetKeyRingTypeMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<GetKeyRingTypeMsg> = keeper => {
  return () => {
    return keeper.getKeyRingType();
  };
};

const handleGetMultiKeyStoreInfoMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<GetMultiKeyStoreInfoMsg> = keeper => {
  return () => {
    return keeper.getMultiKeyStoreInfo();
  };
};

const handleChangeKeyRingMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<ChangeKeyRingMsg> = keeper => {
  return (_, msg) => {
    return keeper.changeKeyStoreFromMultiKeyStore(msg.index);
  };
};

const handleSetKeyRingCoinTypeMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<SetKeyStoreCoinTypeMsg> = keeper => {
  return (_, msg) => {
    keeper.setKeyStoreCoinType(msg.chainId, msg.coinType);
    return keeper.keyRingStatus;
  };
};

const handleGetKeyStoreBIP44SelectablesMsg: (
  keeper: KeyRingKeeper
) => InternalHandler<GetKeyStoreBIP44SelectablesMsg> = keeper => {
  return (_, msg) => {
    return keeper.getKeyStoreBIP44Selectables(msg.chainId, msg.paths);
  };
};
