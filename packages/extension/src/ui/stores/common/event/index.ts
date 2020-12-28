import { KeyRingStatus } from "../../../../background/keyring";
import { ChainInfo } from "../../../../background/chains";

export interface StoreEvent {
  onSetChainInfo?: (info: ChainInfo) => void;
  onSetChainInfoAsync?: (info: ChainInfo) => Promise<void>;

  onSetChainInfos?: (infos: ChainInfo[]) => void;
  onSetChainInfosAsync?: (infos: ChainInfo[]) => Promise<void>;

  onSetKeyRingStatus?: (status: KeyRingStatus) => void;
  onSetKeyRingStatusAsync?: (status: KeyRingStatus) => Promise<void>;

  onChangeKeyRing?: () => void;
  onChangeKeyRingAsync?: () => Promise<void>;
}

export class HasStoreEvents {
  protected readonly storeEvents: StoreEvent[] = [];

  public onSetChainInfo(info: ChainInfo): void {
    for (const baseStore of this.storeEvents) {
      if (baseStore.onSetChainInfo) {
        baseStore.onSetChainInfo(info);
      }
    }
  }

  public async onSetChainInfoAsync(info: ChainInfo): Promise<void> {
    for (const baseStore of this.storeEvents) {
      if (baseStore.onSetChainInfoAsync) {
        await baseStore.onSetChainInfoAsync(info);
      }
    }
  }

  public onSetChainInfos(infos: ChainInfo[]): void {
    for (const baseStore of this.storeEvents) {
      if (baseStore.onSetChainInfos) {
        baseStore.onSetChainInfos(infos);
      }
    }
  }

  public async onSetChainInfosAsync(infos: ChainInfo[]): Promise<void> {
    for (const baseStore of this.storeEvents) {
      if (baseStore.onSetChainInfosAsync) {
        await baseStore.onSetChainInfosAsync(infos);
      }
    }
  }

  public onSetKeyRingStatus(status: KeyRingStatus): void {
    for (const baseStore of this.storeEvents) {
      if (baseStore.onSetKeyRingStatus) {
        baseStore.onSetKeyRingStatus(status);
      }
    }
  }

  public async onSetKeyRingStatusAsync(status: KeyRingStatus): Promise<void> {
    for (const baseStore of this.storeEvents) {
      if (baseStore.onSetKeyRingStatusAsync) {
        await baseStore.onSetKeyRingStatusAsync(status);
      }
    }
  }

  public onChangeKeyRing(): void {
    for (const baseStore of this.storeEvents) {
      if (baseStore.onChangeKeyRing) {
        baseStore.onChangeKeyRing();
      }
    }
  }

  public async onChangeKeyRingAsync(): Promise<void> {
    for (const baseStore of this.storeEvents) {
      if (baseStore.onChangeKeyRingAsync) {
        await baseStore.onChangeKeyRingAsync();
      }
    }
  }
}
