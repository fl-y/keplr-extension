import { InteractionWaitingData } from "./types";
import { Env, FnRequestInteractionOptions } from "@keplr/router";
import { PushInteractionDataMsg } from "./foreground/messages";

export class InteractionKeeper {
  protected waitingMap: Map<string, InteractionWaitingData> = new Map();
  protected resolverMap: Map<
    string,
    { onApprove: (result: unknown) => void; onReject: (e: Error) => void }
  > = new Map();

  async waitApprove(
    env: Env,
    url: string,
    type: string,
    data: unknown,
    options?: FnRequestInteractionOptions
  ): Promise<unknown> {
    if (!type) {
      throw new Error("Type should not be empty");
    }

    // TODO: Add timeout?
    const interactionWaitingData = this.addDataToMap(type, data);

    const msg = new PushInteractionDataMsg(interactionWaitingData);

    return await this.wait(msg.data.id, () => {
      env.requestInteraction(url, msg, options);
    });
  }

  protected async wait(id: string, fn: () => void): Promise<unknown> {
    if (this.resolverMap.has(id)) {
      throw new Error("Id is aleady in use");
    }

    return new Promise<unknown>((resolve, reject) => {
      this.resolverMap.set(id, {
        onApprove: resolve,
        onReject: reject
      });

      fn();
    });
  }

  approve(id: string, result: unknown) {
    if (this.resolverMap.has(id)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.resolverMap.get(id)!.onApprove(result);
      this.resolverMap.delete(id);
    }
  }

  reject(id: string) {
    if (this.resolverMap.has(id)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.resolverMap.get(id)!.onReject(new Error("Request rejected"));
      this.resolverMap.delete(id);
    }
  }

  protected addDataToMap(type: string, data: unknown): InteractionWaitingData {
    const bytes = new Uint8Array(8);
    const id: string = Array.from(crypto.getRandomValues(bytes))
      .map(value => {
        return value.toString(16);
      })
      .join("");

    const interactionWaitingData: InteractionWaitingData = {
      id,
      type,
      data
    };

    if (this.waitingMap.has(id)) {
      throw new Error("Id is aleady in use");
    }

    this.waitingMap.set(id, interactionWaitingData);
    return interactionWaitingData;
  }

  protected removeDataFromMap(id: string) {
    this.waitingMap.delete(id);
  }
}
