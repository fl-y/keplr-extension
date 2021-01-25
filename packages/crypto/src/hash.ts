import { sha256 } from "sha.js";

import { Buffer } from "buffer/";

export class Hash {
  static sha256(data: Uint8Array): Uint8Array {
    return new Uint8Array(
      Buffer.from(new sha256().update(data).digest("hex"), "hex")
    );
  }
}
