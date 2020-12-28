import { Int } from "@keplr/unit";
import { AxiosInstance } from "axios";

export interface Account {
  getType(): string;
  getAddress(): string;
  getAccountNumber(): Int;
  getSequence(): Int;
}

export class BaseAccount implements Account {
  public static async fetchFromRest(
    instance: AxiosInstance,
    address: string
  ): Promise<BaseAccount> {
    const result = await instance.get(`auth/accounts/${address}`);

    return BaseAccount.fromAminoJSON(result.data);
  }

  public static fromAminoJSON(
    obj:
      | {
          height: string;
          result: {
            type: string;
            value: any;
          };
        }
      | { type: string; value: any }
  ): BaseAccount {
    if ("height" in obj) {
      obj = obj.result;
    }

    const type = obj.type;
    if (!type) {
      throw new Error(`Account's type is unknown: ${JSON.stringify(obj)}`);
    }

    let value = obj.value;

    // If the account is the vesting account that embeds the base vesting account,
    // the actual base account exists under the base vesting account.
    // But, this can be different according to the version of cosmos-sdk.
    // So, anyway, try to parse it by some ways...
    const baseVestingAccount =
      value.BaseVestingAccount || value.baseVestingAccount;
    if (baseVestingAccount) {
      value = baseVestingAccount.BaseAccount || baseVestingAccount.baseAccount;
    }

    const address = value.address;
    if (!address) {
      throw new Error(`Account's address is unknown: ${JSON.stringify(obj)}`);
    }

    const accountNumber = value.account_number;
    if (accountNumber == null) {
      throw new Error(
        `Account's account number is unknown: ${JSON.stringify(obj)}`
      );
    }

    const sequence = value.sequence;
    if (sequence == null) {
      throw new Error(`Account's sequence is unknown: ${JSON.stringify(obj)}`);
    }

    return new BaseAccount(
      type,
      address,
      new Int(accountNumber),
      new Int(sequence)
    );
  }

  constructor(
    protected readonly type: string,
    protected readonly address: string,
    protected readonly accountNumber: Int,
    protected readonly sequence: Int
  ) {}

  getType(): string {
    return this.type;
  }

  getAddress(): string {
    return this.address;
  }

  getAccountNumber(): Int {
    return this.accountNumber;
  }

  getSequence(): Int {
    return this.sequence;
  }
}
