import { IRecipientConfig } from "./types";
import { TxChainSetter } from "./chain";
import { ChainGetter } from "@keplr/stores";
import { action, observable } from "mobx";
import { EmptyAddressError, InvalidBech32Error } from "./errors";
import { Bech32Address } from "@keplr/cosmos";
import { useState } from "react";

export class RecipientConfig extends TxChainSetter implements IRecipientConfig {
  @observable
  protected _recipient!: string;

  constructor(chainGetter: ChainGetter, initialChainId: string) {
    super(chainGetter, initialChainId);

    this.setRecipient("");
  }

  get recipient(): string {
    return this._recipient;
  }

  getError(): Error | undefined {
    if (!this.recipient) {
      return new EmptyAddressError("Address is empty");
    }
    const bech32Prefix = this.chainInfo.bech32Config.bech32PrefixAccAddr;
    try {
      Bech32Address.validate(this.recipient, bech32Prefix);
    } catch (e) {
      return new InvalidBech32Error(
        `Invalid bech32: ${e.message || e.toString()}`
      );
    }
    return;
  }

  @action
  setRecipient(recipient: string): void {
    this._recipient = recipient;
  }
}

export const useRecipientConfig = (
  chainGetter: ChainGetter,
  chainId: string
) => {
  const [config] = useState(new RecipientConfig(chainGetter, chainId));
  config.setChain(chainId);

  return config;
};
