import { InteractionStore as InteractionStoreBase } from "../../../stores/interaction";
import { MessageRequester } from "../../../../common/message";
import { EnableKeyRingMsg } from "../../../../background/keyring";

export class InteractionStore extends InteractionStoreBase {
  constructor(msgRequester: MessageRequester) {
    super(msgRequester);
  }

  approveEnableKeyring(): void {
    // In this case, if the multiple waiting datas exist, just approve all the data.
    const datas = this.getDatas(EnableKeyRingMsg.type());
    for (const data of datas) {
      this.approve(EnableKeyRingMsg.type(), data.id);
    }
  }
}
