import { HasMapStore } from "../common/map";
import { DeepReadonly } from "utility-types";
import { action, computed, observable } from "mobx";
import { actionAsync, task } from "mobx-utils";
import { ChainGetter } from "../common/types";
import { Api } from "@chainapsis/cosmosjs/core/api";
import { defaultTxEncoder } from "@chainapsis/cosmosjs/common/stdTx";
import { stdTxBuilder } from "@chainapsis/cosmosjs/common/stdTxBuilder";
import Axios from "axios";
import { Context } from "@chainapsis/cosmosjs/core/context";
import { Account } from "@chainapsis/cosmosjs/core/account";
import { queryAccount } from "@chainapsis/cosmosjs/core/query";
import { Rest } from "@chainapsis/cosmosjs/core/rest";
import { Codec } from "@chainapsis/ts-amino";
import * as CmnCdc from "@chainapsis/cosmosjs/common/codec";
import * as Crypto from "@chainapsis/cosmosjs/crypto";
import * as Bank from "@chainapsis/cosmosjs/x/bank";
import * as Distr from "@chainapsis/cosmosjs/x/distribution";
import * as Staking from "@chainapsis/cosmosjs/x/staking";
import * as Slashing from "@chainapsis/cosmosjs/x/slashing";
import * as Gov from "@chainapsis/cosmosjs/x/gov";
import * as Wasm from "@chainapsis/cosmosjs/x/wasm";
import * as SecretWasm from "../../../common/secretjs/x/compute";
import { GaiaRest } from "@chainapsis/cosmosjs/gaia/rest";

function waitKeplrInit(): Promise<void> {
  return new Promise(resolve => {
    if (window.keplr) {
      resolve();
    } else {
      window.addEventListener("onload", () => {
        if (!window.keplr) {
          throw new Error("Please install the Keplr");
        }

        resolve();
      });
    }
  });
}

export class AccountInfo {
  @observable
  protected _bech32Address?: string;

  @observable
  protected _error?: string;

  @observable
  protected _isLoaded!: boolean;

  constructor(
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    this.init();

    this.load();
  }

  @action
  protected init() {
    this._isLoaded = false;
  }

  @action
  protected setError(error: string | undefined) {
    this._error = error;
  }

  @actionAsync
  protected async load() {
    this._isLoaded = false;
    try {
      await task(waitKeplrInit());

      /* eslint-disable @typescript-eslint/no-non-null-assertion */

      await task(window.keplr!.enable(this.chainId));
      const accounts = await task(
        window.getOfflineSigner!(this.chainId)?.getAccounts()
      );

      console.log(accounts);
      this._bech32Address = accounts[0].address;

      /* eslint-enable @typescript-eslint/no-non-null-assertion */

      this.setError(undefined);
    } catch (e) {
      this.setError(e.message);
    } finally {
      this._isLoaded = true;
    }
  }

  get bech32Address(): string | undefined {
    return this._bech32Address;
  }

  get error(): string | undefined {
    return this._error;
  }

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  @computed
  get api(): Api<Rest> {
    const chainInfo = this.chainGetter.getChain(this.chainId);

    const isStargate = chainInfo.features
      ? chainInfo.features.includes("stargate")
      : false;

    return new Api<Rest>(
      {
        chainId: chainInfo.chainId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        walletProvider: window.cosmosJSWalletProvider!,
        rpc: chainInfo.rpc,
        rest: chainInfo.rest
      },
      {
        txEncoder: defaultTxEncoder,
        txBuilder: stdTxBuilder,
        rpcInstanceFactory: chainInfo.rpcConfig
          ? (rpc: string) => {
              return Axios.create({
                ...{
                  baseURL: rpc
                },
                ...chainInfo.rpcConfig
              });
            }
          : undefined,
        restInstanceFactory: chainInfo.restConfig
          ? (rest: string) => {
              return Axios.create({
                ...{
                  baseURL: rest
                },
                ...chainInfo.restConfig
              });
            }
          : undefined,
        restFactory: (context: Context) => new GaiaRest(context),
        queryAccount: (
          context: Context,
          address: string | Uint8Array
        ): Promise<Account> => {
          return queryAccount(
            context.get("rpcInstance"),
            address,
            chainInfo.bech32Config.bech32PrefixAccAddr,
            {
              isStargate
            }
          );
        },
        bech32Config: chainInfo.bech32Config,
        bip44: chainInfo.bip44,
        registerCodec: (codec: Codec) => {
          CmnCdc.registerCodec(codec);
          Crypto.registerCodec(codec);
          Bank.registerCodec(codec);
          Distr.registerCodec(codec);
          Staking.registerCodec(codec);
          Slashing.registerCodec(codec);
          Gov.registerCodec(codec);
          Wasm.registerCodec(codec);
          SecretWasm.registerCodec(codec);
        }
      }
    );
  }
}

export class AccountStore extends HasMapStore<AccountInfo> {
  constructor(protected readonly chainGetter: ChainGetter) {
    super((chainId: string) => {
      return new AccountInfo(chainId, chainGetter);
    });
  }

  getAccountInfo(chainId: string): DeepReadonly<AccountInfo> {
    return this.get(chainId);
  }
}
