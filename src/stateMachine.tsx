/* eslint @typescript-eslint/no-namespace: "off" */
import {
  useState,
  useMemo,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from "react";
import { v4 as uuid } from "uuid";
import hash from "object-hash";

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

export declare namespace Machine {
  type ValidTransitions<Event extends string, States> = Record<Event, States>;

  type Config<Context, States> = {
    initial: keyof States;
    context: Context;
    states: States;
    events?: Partial<Record<EventListenerType, EventFunction<Context, States>>>;
    id: string;
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
    event: Machine.Event<States>,
    mutateCtx?: ((ctx: Context) => Partial<Context>) | Partial<Context>
  ) => void;

  type EventListenerType = "onChange" | "onDone" | "onStart";
  type EventFunction<Context, States> = (
    state: MachineState<Context, States>,
    send: SendFunction<Context, States>
  ) => void | (() => any) | Promise<(() => any) | void>;

  type ConditionFunction<Context, States> = (
    state: Machine.MachineState<Context, States>,
    index: number
  ) => boolean;
}

class Machine<Context, States> {
  config: Machine.Config<Context, States>;
  state: Machine.MachineState<Context, States>;
  private _eventListeners: Record<
    Machine.EventListenerType,
    [
      Machine.EventFunction<Context, States>,
      (() => any) | void | Promise<(() => any) | void>
    ][]
  > = {
    onStart: [],
    onChange: [],
    onDone: [],
  };
  private _stop = false;
  private _signature?: string;

  getMachineSignature() {
    this._signature =
      this._signature ?? `${this.config.id}-${hash(this.config)}`;
    return this._signature;
  }

  private updateIsFinalState() {
    const { states } = this.config;
    const { value } = this.state;
    this.state.done = states[value] && Object.keys(states[value]).length === 0;
  }

  private async callEventListener(type: Machine.EventListenerType) {
    // Call listeners
    for (const arr of this._eventListeners[type]) {
      const fn = arr[0];
      const clearFn = await arr[1];
      if (clearFn) {
        await clearFn();
      }

      const stateId = this.state.id;
      const wrappedSend: Machine.SendFunction<Context, States> = (
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

  constructor(config: Machine.Config<Context, States>) {
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
    undo: this.undo.bind(this),
    redo: this.redo.bind(this),
  };

  send(
    event: Machine.Event<States>,
    mutateCtx?: ((ctx: Context) => Partial<Context>) | Partial<Context>
  ) {
    if (this._stop) return;

    const nextStateValue: keyof States =
      // @ts-ignore
      this.config.states[this.state.value]?.[event];

    // Protect against invaid transition
    if (!nextStateValue || !this.config.states[nextStateValue]) return;

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
    type: Machine.EventListenerType,
    fn: Machine.EventFunction<Context, States>
  ) {
    this._eventListeners[type].push([fn, undefined]);
  }

  removeEventListener(
    type: Machine.EventListenerType,
    fn: Machine.EventFunction<Context, States>
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

  private rewind(stopFn?: Machine.ConditionFunction<Context, States>) {
    let crnt: Machine.MachineState<Context, States> | null = this.state.prev;
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

  private fastFoward(stopFn?: Machine.ConditionFunction<Context, States>) {
    let crnt: Machine.MachineState<Context, States> | null = this.state.next;
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

  private undo(conditionFn?: Machine.ConditionFunction<Context, States>) {
    if (this.state.prev && (!conditionFn || conditionFn(this.state, 0))) {
      this.state = this.state.prev;
      this.signalChange();
    }
  }

  private redo(conditionFn?: Machine.ConditionFunction<Context, States>) {
    if (this.state.next && (!conditionFn || conditionFn(this.state, 0))) {
      this.state = this.state.next;
      this.signalChange();
    }
  }

  destroy() {
    this.stop();
    const eventTypes: Machine.EventListenerType[] = [
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
    this.signalChange();
  }

  stop() {
    this._stop = true;
  }

  restoreState(state: Machine.MachineState<Context, States>) {
    this.state = state;
  }
}

export function createMachine<Context, States>(
  config: Machine.Config<Context, States>
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
>(id: string, configs: Machines) {
  return () => {
    const machines: ObjectReturnValues<Machines> = {} as any;
    Object.entries(configs).forEach(([key, m]: [string, any]) => {
      machines[key as Key] = m();
    });

    function createFunction<Name extends keyof Machine<any, any>>(
      key1: Name,
      key2?: string
    ): TypeOfClassMethod<Machine<any, any>, Name> {
      return ((...args: any[]) => {
        for (const machineName in machines) {
          // @ts-ignore
          if (key2) machines[machineName][key1][key2](...args);
          // @ts-ignore
          else machines[machineName][key1](...args);
        }
      }) as any;
    }

    return [
      machines,
      {
        send: createFunction("send"),
        addEventListener: createFunction("addEventListener"),
        removeEventListener: createFunction("removeEventListener"),
        destroy: createFunction("destroy"),
        start: createFunction("start"),
        stop: createFunction("stop"),
        history: {
          fastForward: createFunction("history", "fastFoward") as any,
          rewind: createFunction("history", "rewind") as any,
          reset: createFunction("history", "reset") as any,
          undo: createFunction("history", "undo") as any,
          redo: createFunction("history", "redo") as any,
        },
        id,
      },
    ] as const;
  };
}

export function useMachine<
  MachineConfig extends ReturnType<typeof combineMachines>
>(machineConfig: MachineConfig, persist?: boolean): ReturnType<MachineConfig>;
export function useMachine<MachineConfig extends () => Machine<any, any>>(
  machineConfig: MachineConfig,
  persist?: boolean
): ReturnType<MachineConfig>;
export function useMachine<MachineConfig extends () => Machine<any, any>>(
  machineConfig: MachineConfig,
  persist = false
): ReturnType<MachineConfig> {
  const [, setSignal] = useState(0);
  const context = useContext(Context);

  const machine = useMemo(() => {
    const m = machineConfig() as ReturnType<MachineConfig>;
    if (Array.isArray(m)) {
      // Combined machines
      m[1].stop();
    } else {
      // Single machine
      m.stop();
    }
    return m;
  }, [machineConfig]);

  const restoreMachineState = useCallback(
    (m: Machine<any, any>, prefix = "") => {
      const signature = [prefix, m.getMachineSignature()]
        .filter(Boolean)
        .join("-");
      if (persist && context.states[signature]) {
        m.restoreState(context.states[signature]);
      }
    },
    [context, persist]
  );

  const saveMachineState = useCallback(
    (m: Machine<any, any>, prefix = "") => {
      const signature = [prefix, m.getMachineSignature()]
        .filter(Boolean)
        .join("-");
      if (persist) {
        context.saveState(signature, m.state);
      }
    },
    [context, persist]
  );

  useEffect(() => {
    function sendSignal() {
      setSignal((n) => n + 1);
    }
    // Combined machines
    if (Array.isArray(machine)) {
      machine[1].addEventListener("onChange", sendSignal);
      for (const m of Object.values(machine[0])) {
        restoreMachineState(m as any, machine[1].id);
      }
      machine[1].start();
      return () => {
        machine[1].removeEventListener("onChange", sendSignal);
        for (const m of Object.values(machine[0])) {
          saveMachineState(m as any, machine[1].id);
        }
        machine[1].destroy();
      };
    }
    // Single machine
    else {
      machine.addEventListener("onChange", sendSignal);
      restoreMachineState(machine);
      machine.start();
      return () => {
        machine.removeEventListener("onChange", sendSignal);
        saveMachineState(machine);
        machine.destroy();
      };
    }
  }, [machine, persist, context, restoreMachineState, saveMachineState]);

  return machine;
}

const Context = createContext<{
  states: Record<string, Machine.MachineState<any, any>>;
  saveState: (id: string, state: Machine.MachineState<any, any>) => any;
}>({
  states: {},
  saveState: () => {},
});

export function Provider({
  children,
}: {
  children: JSX.Element | JSX.Element[];
}) {
  const [states, setStates] = useState<
    Record<string, Machine.MachineState<any, any>>
  >({});

  const saveState = useCallback(
    (id: string, state: Machine.MachineState<any, any>) => {
      setStates((s) => {
        s[id] = state;
        console.log(s);
        return s;
      });
    },
    []
  );

  return (
    <Context.Provider value={{ states, saveState }}>
      {children}
    </Context.Provider>
  );
}
