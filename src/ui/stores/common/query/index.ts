import { action, observable } from "mobx";
import { AxiosInstance } from "axios";
import { actionAsync, task } from "mobx-utils";
import { KVStore } from "../../../../common/kvstore";

type QueryError<E> = {
  status: number;
  statusText: string;
  message: string;
  data?: E;
};

type QueryResponse<T> = {
  status: number;
  data: T;
  staled: boolean;
  timestamp: number;
};

/**
 * Base of the observable query classes.
 * This recommends to use the Axios to query the response.
 */
export abstract class ObservableQueryBase<T = unknown, E = unknown> {
  // Just use the oberable ref because the response is immutable and not directly adjusted.
  @observable.ref
  private _response?: Readonly<QueryResponse<T>>;

  @observable
  public isFetching: boolean = false;

  @observable.ref
  private _error?: Readonly<QueryError<E>>;

  @actionAsync
  async fetch(): Promise<void> {
    // If response is fetching, do nothing.
    if (this.isFetching) {
      return;
    }

    this.isFetching = true;

    // If there is no existing response, try to load saved reponse.
    if (!this._response) {
      const staledResponse = await task(this.loadStaledResponse());
      if (staledResponse) {
        this.setResponse(staledResponse);
      }
    } else {
      // Make the existing response as staled.
      this.setResponse({
        ...this._response,
        staled: true
      });
    }

    try {
      const response = await task(this.fetchResponse());
      this.setResponse(response);
      // Clear the error if fetching succeeds.
      this.setError(undefined);
      await task(this.saveResponse(response));
    } catch (e) {
      // If error is from Axios, and get response.
      if (e.response) {
        const error: QueryError<E> = {
          status: e.response.status,
          statusText: e.response.statusText,
          message: e.response.statusText,
          data: e.response.data
        };

        this.setError(error);
      } else if (e.request) {
        // if can't get the response.
        const error: QueryError<E> = {
          status: 0,
          statusText: "Failed to get response",
          message: "Failed to get response"
        };

        this.setError(error);
      } else {
        const error: QueryError<E> = {
          status: 0,
          statusText: e.message,
          message: e.message
        };

        this.setError(error);
      }
    } finally {
      this.isFetching = false;
    }
  }

  public get response() {
    if (!this._response && !this._error) {
      this.fetch();
    }

    return this._response;
  }

  public get error() {
    return this._error;
  }

  @action
  protected setResponse(response: Readonly<QueryResponse<T>>) {
    this._response = response;
  }

  @action
  protected setError(error: QueryError<E> | undefined) {
    this._error = error;
  }

  protected abstract fetchResponse(): Promise<QueryResponse<T>>;

  protected abstract async saveResponse(
    response: Readonly<QueryResponse<T>>
  ): Promise<void>;

  protected abstract async loadStaledResponse(): Promise<
    QueryResponse<T> | undefined
  >;
}

/**
 * ObservableQuery defines the base class to query the result from endpoint.
 * This supports the stale state if previous query exists.
 */
export class ObservableQuery<
  T = unknown,
  E = unknown
> extends ObservableQueryBase<T, E> {
  constructor(
    private readonly kvStore: KVStore,
    private readonly instance: AxiosInstance,
    private readonly url: string
  ) {
    super();
  }

  protected async fetchResponse(): Promise<QueryResponse<T>> {
    const result = await task(this.instance.get<T>(this.url));
    return {
      data: result.data,
      status: result.status,
      staled: false,
      timestamp: Date.now()
    };
  }

  protected async saveResponse(
    response: Readonly<QueryResponse<T>>
  ): Promise<void> {
    const key = `${this.instance.name}-${this.instance.getUri({
      url: this.url
    })}`;
    await this.kvStore.set(key, response);
  }

  protected async loadStaledResponse(): Promise<QueryResponse<T> | undefined> {
    const key = `${this.instance.name}-${this.instance.getUri({
      url: this.url
    })}`;
    const response = await this.kvStore.get<QueryResponse<T>>(key);
    if (response) {
      return {
        ...response,
        staled: true
      };
    }
    return undefined;
  }
}
