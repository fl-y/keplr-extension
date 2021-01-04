import { Router, MessageRequester, BACKGROUND_PORT } from "@keplr/router";
import {
  InteractionForegroundHandler,
  interactionForegroundInit,
  InteractionForegroundKeeper,
  InteractionWaitingData,
  ApproveInteractionMsg,
  RejectInteractionMsg
} from "@keplr/background";
import { runInAction, action, observable, IObservableArray } from "mobx";

export class InteractionStore implements InteractionForegroundHandler {
  @observable.shallow
  protected datas!: Map<string, InteractionWaitingData[]>;

  constructor(
    protected readonly router: Router,
    protected readonly msgRequester: MessageRequester
  ) {
    runInAction(() => {
      this.datas = new Map();
    });

    const keeper = new InteractionForegroundKeeper(this);
    interactionForegroundInit(router, keeper);
  }

  getDatas(type: string): InteractionWaitingData[] {
    return this.datas.get(type) ?? [];
  }

  @action
  onInteractionDataReceived(data: InteractionWaitingData) {
    if (!this.datas.has(data.type)) {
      this.datas.set(data.type, observable.array([]));
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.datas.get(data.type)!.push(data);
  }

  @action
  approve(type: string, id: string, result: unknown) {
    this.removeData(type, id);
    this.msgRequester.sendMessage(
      BACKGROUND_PORT,
      new ApproveInteractionMsg(id, result)
    );
  }

  @action
  reject(type: string, id: string) {
    this.removeData(type, id);
    this.msgRequester.sendMessage(
      BACKGROUND_PORT,
      new RejectInteractionMsg(id)
    );
  }

  @action
  protected removeData(type: string, id: string) {
    if (this.datas.has(type)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const find = this.datas.get(type)!.find(data => {
        return data.id === id;
      });
      if (find) {
        (this.datas.get(type) as IObservableArray<
          InteractionWaitingData
        >).remove(find);
      }
    }
  }
}
