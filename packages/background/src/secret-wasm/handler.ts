import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import { GetPubkeyMsg, ReqeustEncryptMsg, RequestDecryptMsg } from "./messages";
import { SecretWasmKeeper } from "./keeper";

const Buffer = require("buffer/").Buffer;

export const getHandler: (keeper: SecretWasmKeeper) => Handler = (
  keeper: SecretWasmKeeper
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case GetPubkeyMsg:
        return handleGetPubkeyMsg(keeper)(env, msg as GetPubkeyMsg);
      case ReqeustEncryptMsg:
        return handleReqeustEncryptMsg(keeper)(env, msg as ReqeustEncryptMsg);
      case RequestDecryptMsg:
        return handleRequestDecryptMsg(keeper)(env, msg as RequestDecryptMsg);
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleGetPubkeyMsg: (
  keeper: SecretWasmKeeper
) => InternalHandler<GetPubkeyMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);

    return Buffer.from(await keeper.getPubkey(env, msg.chainId)).toString(
      "hex"
    );
  };
};

const handleReqeustEncryptMsg: (
  keeper: SecretWasmKeeper
) => InternalHandler<ReqeustEncryptMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);

    // TODO: Should ask for user whether approve or reject to encrypt.
    return Buffer.from(
      await keeper.encrypt(env, msg.chainId, msg.contractCodeHash, msg.msg)
    ).toString("hex");
  };
};

const handleRequestDecryptMsg: (
  keeper: SecretWasmKeeper
) => InternalHandler<RequestDecryptMsg> = keeper => {
  return async (env, msg) => {
    await keeper.checkAccessOrigin(env, msg.chainId, msg.origin);

    // XXX: Is there need to ask for user whether approve or reject to decrypt?
    return Buffer.from(
      await keeper.decrypt(
        env,
        msg.chainId,
        Buffer.from(msg.cipherTextHex, "hex"),
        Buffer.from(msg.nonceHex, "hex")
      )
    ).toString("hex");
  };
};
