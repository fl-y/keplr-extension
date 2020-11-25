import { InteractionForegroundHandler } from "../../../background/interaction/foreground/types";
import { InteractionWaitingData } from "../../../background/interaction/types";
import { ObservableMap, observable, runInAction, action } from "mobx";
import { IObservableArray } from "mobx/lib/types/observablearray";
import { MessageRequester } from "../../../common/message";
import { BACKGROUND_PORT } from "../../../common/message/constant";
import {
  ApproveInteractionMsg,
  RejectInteractionMsg
} from "../../../background/interaction/messages";

export class InteractionStore implements InteractionForegroundHandler {
  protected datas: ObservableMap<
    string,
    InteractionWaitingData[]
  > = runInAction(() => {
    return observable.map({});
  });

  constructor(protected readonly msgRequester: MessageRequester) {
    window.addEventListener("interactionDataReceived", (data: any) => {
      this.onInteractionDataReceived(data.detail.data);
    });
  }

  getDatas(type: string): InteractionWaitingData[] {
    return this.datas.get(type) ?? [];
  }

  @action
  onInteractionDataReceived(data: InteractionWaitingData) {
    if (!this.datas.has(data.type)) {
      this.datas.set(data.type, []);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.datas.get(data.type)!.push(data);
  }

  @action
  approve(type: string, id: string) {
    this.removeData(type, id);
    this.msgRequester.sendMessage(
      BACKGROUND_PORT,
      new ApproveInteractionMsg(id)
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
