/* eslint @typescript-eslint/no-namespace: "off" */
import { useState, useMemo, useEffect } from "react";
import { v4 as uuid } from "uuid";

// Converts a union of two types into an intersection
// i.e. A | B -> A & B
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// Flattens two union types into a single type with optional values
// i.e. FlattenUnion<{ a: number, c: number } | { b: string, c: number }> = { a?: number, b?: string, c: number }
export type FlattenUnion<T> = {
  [K in keyof UnionToIntersection<T>]: K extends keyof T
    ? T[K] extends any[]
      ? T[K]
      : T[K] extends object
      ? FlattenUnion<T[K]>
      : T[K]
    : UnionToIntersection<T>[K] | undefined;
};

type ObjectReturnValues<T extends Record<string, () => any>> = {
  [P in keyof T]: ReturnType<T[P]>;
};

type TypeOfClassMethod<T, M extends keyof T> = T[M] extends Function
  ? T[M]
  : never;

export declare namespace StateMachine {
  type ValidTransitions<Event extends string, States> = Record<Event, States>;

  type Config<Context, States> = {
    initial: keyof States;
    context: Context;
    states: States;
    events?: Partial<Record<EventListenerType, EventFunction<Context, States>>>;
    id?: string;
  };

  type MachineState<Context, States> = {
    event: Event<States> | null;
    value: keyof States;
    context: Context;
    done: boolean;
    prev: MachineState<Context, States> | null;
    next: MachineState<Context, States> | null;
    id: string;
  };

  type Event<States> = keyof FlattenUnion<States[keyof States]>;

  type SendFunction<Context, States> = (
    event: StateMachine.Event<States>,
    mutateCtx?: ((ctx: Context) => Partial<Context>) | Partial<Context>
  ) => void;

  type EventListenerType = "onChange" | "onDone" | "onStart";
  type EventFunction<Context, States> = (
    state: MachineState<Context, States>,
    send: SendFunction<Context, States>
  ) => void | (() => any) | Promise<(() => any) | void>;
}

class Machine<Context, States> {
  config: StateMachine.Config<Context, States>;
  state: StateMachine.MachineState<Context, States>;
  private _eventListeners: Record<
    StateMachine.EventListenerType,
    [
      StateMachine.EventFunction<Context, States>,
      (() => any) | void | Promise<(() => any) | void>
    ][]
  > = {
    onStart: [],
    onChange: [],
    onDone: [],
  };
  private _stop = false;

  private updateIsFinalState() {
    const { states } = this.config;
    const { value } = this.state;
    this.state.done = states[value] && Object.keys(states[value]).length === 0;
  }

  private async callEventListener(type: StateMachine.EventListenerType) {
    // Call listeners
    for (const arr of this._eventListeners[type]) {
      const fn = arr[0];
      const clearFn = await arr[1];
      if (clearFn) {
        await clearFn();
      }

      const stateId = this.state.id;
      const wrappedSend: StateMachine.SendFunction<Context, States> = (
        state,
        send
      ) => {
        if (this.state.id === stateId) {
          this.send(state, send);
        }
      };
      arr[1] = fn(this.state, wrappedSend);
    }
  }

  private signalChange() {
    this.updateIsFinalState();

    if (this.state.prev === null) {
      this.callEventListener("onStart");
    }
    this.callEventListener("onChange");
    if (this.state?.done) {
      this.callEventListener("onDone");
    }
  }

  private reset() {
    this.state = {
      event: null,
      value: this.config.initial,
      context: this.config.context,
      done: false,
      prev: null,
      next: null,
      id: uuid(),
    };
    this.signalChange();
    return this.state;
  }

  constructor(config: StateMachine.Config<Context, States>) {
    this.send = this.send.bind(this);
    this.addEventListener = this.addEventListener.bind(this);
    this.removeEventListener = this.removeEventListener.bind(this);
    this.destroy = this.destroy.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);

    this.config = config;
    Object.entries(this.config.events ?? {}).forEach(([type, fn]) => {
      this.addEventListener(type as any, fn!);
    });
    this.state = this.reset();
  }

  history = {
    fastFoward: this.fastFoward.bind(this),
    rewind: this.rewind.bind(this),
    reset: this.reset.bind(this),
  };

  send(
    event: StateMachine.Event<States>,
    mutateCtx?: ((ctx: Context) => Partial<Context>) | Partial<Context>
  ) {
    if (this._stop) return;

    const nextStateValue: keyof States =
      // @ts-ignore
      this.config.states[this.state.value]?.[event];

    // Protect against invaid transition
    if (!nextStateValue) return;

    let context = this.state.context;

    if (mutateCtx) {
      context = {
        ...context,
        ...(typeof mutateCtx === "function"
          ? // @ts-ignore
            mutateCtx(context)
          : mutateCtx),
      };
    }

    this.state = {
      value: nextStateValue,
      done: false,
      context,
      event,
      prev: this.state,
      next: null,
      id: uuid(),
    };

    if (this.state.prev) {
      this.state.prev.next = this.state;
    }

    this.signalChange();
  }

  addEventListener(
    type: StateMachine.EventListenerType,
    fn: StateMachine.EventFunction<Context, States>
  ) {
    this._eventListeners[type].push([fn, undefined]);
  }

  removeEventListener(
    type: StateMachine.EventListenerType,
    fn: StateMachine.EventFunction<Context, States>
  ) {
    this._eventListeners[type] = this._eventListeners[type].filter(
      async (arr) => {
        // check if this is the function we are looking to remove
        const shouldClear = arr[0] !== fn;
        // check if the last call of the fuction saved a clear function
        const clearFn = await arr[1];
        if (shouldClear && clearFn) {
          clearFn();
        }
        return shouldClear;
      }
    );
  }

  private rewind(
    stopFn?: (
      state: StateMachine.MachineState<Context, States>,
      index: number
    ) => boolean
  ) {
    let crnt: StateMachine.MachineState<Context, States> | null =
      this.state.prev;
    let index = -1;
    while (crnt) {
      if (stopFn === undefined || stopFn(crnt, index)) {
        this.state = crnt;
        this.signalChange();
        return;
      }
      crnt = crnt.prev;
      index--;
    }
  }

  private fastFoward(
    stopFn?: (
      state: StateMachine.MachineState<Context, States>,
      index: number
    ) => boolean
  ) {
    let crnt: StateMachine.MachineState<Context, States> | null =
      this.state.next;
    let index = 1;
    while (crnt) {
      if (stopFn === undefined || stopFn(crnt, index)) {
        this.state = crnt;
        this.signalChange();
        return;
      }
      crnt = crnt.next;
      index++;
    }
  }

  destroy() {
    this.stop();
    const eventTypes: StateMachine.EventListenerType[] = [
      "onStart",
      "onChange",
      "onDone",
    ];
    for (const type of eventTypes) {
      for (const arr of this._eventListeners[type]) {
        this.removeEventListener(type, arr[0]);
      }
    }
  }

  start() {
    this._stop = false;
  }

  stop() {
    this._stop = true;
  }
}

export function createMachine<Context, States>(
  config: StateMachine.Config<Context, States>
) {
  function create() {
    return new Machine<Context, States>(config);
  }
  create.config = (
    overwriteConfig: Partial<Pick<typeof config, "initial" | "context">>
  ) => {
    return () =>
      new Machine<Context, States>({
        ...config,
        ...overwriteConfig,
        context: {
          ...config.context,
          ...overwriteConfig.context,
        },
      });
  };
  return create;
}

export function combineMachines<
  Key extends string,
  Machines extends Record<Key, () => Machine<any, any>>
>(configs: Machines) {
  return () => {
    const machines: ObjectReturnValues<Machines> = {} as any;
    Object.entries(configs).forEach(([key, m]: [string, any]) => {
      machines[key as Key] = m();
    });

    function createFunction<Name extends keyof Machine<any, any>>(
      fnName: Name
    ): Record<Name, TypeOfClassMethod<Machine<any, any>, Name>> {
      return {
        [fnName]: (...args: any[]) => {
          for (const key in machines) {
            // @ts-ignore
            machines[key][fnName](...args);
          }
        },
      } as any;
    }

    return [
      machines,
      {
        ...createFunction("send"),
        ...createFunction("addEventListener"),
        ...createFunction("removeEventListener"),
        ...createFunction("destroy"),
        ...createFunction("start"),
        ...createFunction("stop"),
      },
    ] as const;
  };
}

export function useMachine<Context, States>(
  machineConfig: () => Machine<Context, States>
) {
  const [, setSignal] = useState(0);

  const machine = useMemo(() => {
    const m = machineConfig();
    m.stop();
    return m;
  }, [machineConfig]);

  useEffect(() => {
    function sendSignal() {
      setSignal((n) => n + 1);
    }
    machine.addEventListener("onChange", sendSignal);
    machine.start();
    return () => {
      machine.removeEventListener("onChange", sendSignal);
      machine.destroy();
    };
  }, [machine]);

  return machine;
}

export function useMachines<
  Key extends string,
  Machines extends Record<Key, () => Machine<any, any>>
>(machineConfigs: Machines) {
  const [, setSignal] = useState(0);

  const machines = useMemo(
    () => {
      const machines = combineMachines(machineConfigs)();
      const [, tellAll] = machines;
      tellAll.stop();
      return machines;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...Object.values(machineConfigs)]
  );

  useEffect(() => {
    function sendSignal() {
      setSignal((n) => n + 1);
    }
    const [, tellAll] = machines;
    tellAll.addEventListener("onChange", sendSignal);
    tellAll.start();
    return () => {
      tellAll.removeEventListener("onChange", sendSignal);
      tellAll.destroy();
    };
  }, [machines]);

  return machines;
}
