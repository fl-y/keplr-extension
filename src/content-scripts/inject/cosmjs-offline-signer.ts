import {
  Coin,
  encodeSecp256k1Signature,
  OfflineSigner,
  serializeSignDoc,
  AccountData,
  SignResponse,
  StdSignDoc
} from "@cosmjs/launchpad";
import { fromHex } from "@cosmjs/encoding";
import { feeFromString } from "../../background/keyring/utils";
import { Keplr } from "./common";

export class CosmJSOfflineSigner implements OfflineSigner {
  constructor(
    protected readonly chainId: string,
    protected readonly keplr: Keplr
  ) {}

  async getAccounts(): Promise<AccountData[]> {
    const key = await this.keplr.getKey(this.chainId);

    return [
      {
        address: key.bech32Address,
        // Currently, only secp256k1 is supported.
        algo: "secp256k1",
        pubkey: fromHex(key.pubKeyHex)
      }
    ];
  }

  async sign(
    signerAddress: string,
    signDoc: StdSignDoc
  ): Promise<SignResponse> {
    if (this.chainId !== signDoc.chain_id) {
      throw new Error("Unmatched chain id with the offline signer");
    }

    const key = await this.keplr.getKey(signDoc.chain_id);

    if (key.bech32Address !== signerAddress) {
      throw new Error("Unknown signer address");
    }

    const txConfig = await this.keplr.getTxConfig(signDoc.chain_id, {
      accountNumber: signDoc.account_number,
      sequence: signDoc.sequence,
      gas: signDoc.fee.gas,
      fee: signDoc.fee.amount
        .map(coin => `${coin.amount} ${coin.denom}`)
        .join(","),
      memo: signDoc.memo
    });

    let feeAmountCoins: Coin[];
    const feeAmount = feeFromString(txConfig.config.fee);
    if (Array.isArray(feeAmount)) {
      feeAmountCoins = feeAmount.map(coin => {
        return {
          denom: coin.denom,
          amount: coin.amount.toString()
        };
      });
    } else {
      feeAmountCoins = [
        {
          denom: feeAmount.denom,
          amount: feeAmount.amount.toString()
        }
      ];
    }

    const newSignDoc: StdSignDoc = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      chain_id: signDoc.chain_id,
      // eslint-disable-next-line @typescript-eslint/camelcase
      account_number: txConfig.config.accountNumber ?? signDoc.account_number,
      sequence: txConfig.config.sequence ?? signDoc.sequence,
      fee: {
        gas: txConfig.config.gas,
        amount: feeAmountCoins
      },
      msgs: signDoc.msgs,
      memo: txConfig.config.memo
    };

    const signature = await this.keplr.sign(
      signDoc.chain_id,
      signerAddress,
      serializeSignDoc(newSignDoc)
    );

    return {
      signed: newSignDoc,
      // Currently, only secp256k1 is supported.
      signature: encodeSecp256k1Signature(
        fromHex(key.pubKeyHex),
        fromHex(signature.signatureHex)
      )
    };
  }
}
