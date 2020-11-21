import { sendMessage } from "../../common/message/send";
import {
  RequestDecryptMsg,
  ReqeustEncryptMsg,
  GetPubkeyMsg
} from "../../background/secret-wasm";
import { BACKGROUND_PORT } from "../../common/message/constant";
import { SecretUtils } from "secretjs/types/enigmautils";

const Buffer = require("buffer/").Buffer;

/**
 * KeplrEnigmaUtils duplicates the public methods that are supported on secretjs's EnigmaUtils class.
 */
export class KeplrEnigmaUtils implements SecretUtils {
  constructor(private readonly chainId: string) {}

  public getPubkey = async (): Promise<Uint8Array> => {
    return Buffer.from(
      await sendMessage(BACKGROUND_PORT, new GetPubkeyMsg(this.chainId)),
      "hex"
    );
  };

  public encrypt = async (
    contractCodeHash: string,
    msg: object
  ): Promise<Uint8Array> => {
    // TODO: Set id.
    return Buffer.from(
      await sendMessage(
        BACKGROUND_PORT,
        new ReqeustEncryptMsg(this.chainId, contractCodeHash, msg)
      ),
      "hex"
    );
  };

  public decrypt = async (
    ciphertext: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> => {
    return Buffer.from(
      await sendMessage(
        BACKGROUND_PORT,
        new RequestDecryptMsg(
          this.chainId,
          Buffer.from(ciphertext).toString("hex"),
          Buffer.from(nonce).toString("hex")
        )
      ),
      "hex"
    );
  };
}
