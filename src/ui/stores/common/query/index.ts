import { action, observable, onBecomeObserved, onBecomeUnobserved } from "mobx";
import Axios, { AxiosInstance, CancelToken, CancelTokenSource } from "axios";
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

  private _isStarted: boolean = false;

  private cancelToken?: CancelTokenSource;

  private observedCount: number = 0;

  protected constructor(protected readonly instance: AxiosInstance) {
    onBecomeObserved(this, "_response", this.becomeObserved);
    onBecomeObserved(this, "isFetching", this.becomeObserved);
    onBecomeObserved(this, "_error", this.becomeObserved);

    onBecomeUnobserved(this, "_response", this.becomeUnobserved);
    onBecomeUnobserved(this, "isFetching", this.becomeUnobserved);
    onBecomeUnobserved(this, "_error", this.becomeUnobserved);
  }

  private becomeObserved = (): void => {
    if (this.observedCount === 0) {
      this.start();
    }
    this.observedCount++;
  };

  private becomeUnobserved = (): void => {
    this.observedCount--;
    if (this.observedCount === 0) {
      this.stop();
    }
  };

  public get isObserved(): boolean {
    return this.observedCount > 0;
  }

  private start() {
    if (!this._isStarted) {
      if (this.canStart()) {
        this._isStarted = true;
        this.fetch();
      }
    }
  }

  private stop() {
    if (this.isStarted) {
      this.onStop();
      this._isStarted = false;
    }
  }

  public get isStarted(): boolean {
    return this._isStarted;
  }

  protected canStart(): boolean {
    return true;
  }

  protected onStop() {
    this.cancel();
  }

  @actionAsync
  async fetch(): Promise<void> {
    // If not started, do nothing.
    if (!this.isStarted) {
      return;
    }

    // If response is fetching, cancel the previous query.
    if (this.isFetching) {
      this.cancel();
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
      this.cancelToken = Axios.CancelToken.source();

      const response = await task(this.fetchResponse(this.cancelToken.token));
      this.setResponse(response);
      // Clear the error if fetching succeeds.
      this.setError(undefined);
      await task(this.saveResponse(response));
    } catch (e) {
      // If canceld, do nothing.
      if (Axios.isCancel(e)) {
        return;
      }

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
      this.cancelToken = undefined;
    }
  }

  public get response() {
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

  public cancel(): void {
    if (this.cancelToken) {
      this.cancelToken.cancel();
    }
  }

  protected abstract fetchResponse(
    cancelToken: CancelToken
  ): Promise<QueryResponse<T>>;

  protected abstract async saveResponse(
    response: Readonly<QueryResponse<T>>
  ): Promise<void>;

  protected abstract async loadStaledResponse(): Promise<
    QueryResponse<T> | undefined
  >;
}

/**
 * ObservableQuery defines the event class to query the result from endpoint.
 * This supports the stale state if previous query exists.
 */
export class ObservableQuery<
  T = unknown,
  E = unknown
> extends ObservableQueryBase<T, E> {
  constructor(
    private readonly kvStore: KVStore,
    instance: AxiosInstance,
    private url: string
  ) {
    super(instance);
  }

  protected async fetchResponse(
    cancelToken: CancelToken
  ): Promise<QueryResponse<T>> {
    const result = await this.instance.get<T>(this.url, {
      cancelToken
    });
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

export class ObservableQueryMap<T = unknown, E = unknown> {
  protected map = observable.map<string, ObservableQuery<T, E>>(
    {},
    {
      deep: false
    }
  );

  constructor(
    private readonly creater: (key: string) => ObservableQuery<T, E>
  ) {}

  get(key: string): ObservableQuery<T, E> {
    if (!this.map.has(key)) {
      const query = this.creater(key);

      this.map.set(key, query);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.map.get(key)!;
  }
}
