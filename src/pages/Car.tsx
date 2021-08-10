import { createMachine, useMachines } from "../stateMachine";
import { ArrayTable } from "../components";
import { useCallback } from "react";
import styled from "styled-components";

const Table = styled(ArrayTable)`
  &,
  th,
  td {
    border: 1px solid black;
    border-collapse: collapse;
  }

  td {
    padding: 5px;
    min-width: 100px;
  }
`;

const wipersLever = createMachine({
  initial: "idle",
  context: {},
  states: {
    wash: {
      timer: "idle",
      stop: "idle",
    },
    idle: {
      up: "wash",
      down: "speed1",
    },
    speed1: {
      up: "idle",
      down: "speed2",
      stop: "idle",
    },
    speed2: {
      up: "speed1",
      down: "speed3",
      stop: "idle",
    },
    speed3: {
      up: "speed2",
      stop: "idle",
    },
  },
  events: {
    onChange: ({ value }, send) => {
      if (value === "wash") {
        const id = window.setTimeout(() => send("timer"), 1000);
        return () => window.clearTimeout(id);
      }
    },
  },
});

const turnSignalLever = createMachine({
  initial: "idle",
  context: {},
  states: {
    blinkLeft: {
      down: "idle",
      stop: "idle",
    },
    idle: {
      up: "blinkLeft",
      down: "blinkRight",
    },
    blinkRight: {
      up: "idle",
      stop: "idle",
    },
  },
});

const transmission = createMachine({
  initial: "park",
  context: {},
  states: {
    park: {
      down: "reverse",
    },
    reverse: {
      up: "park",
      down: "nutral",
      stop: "park",
    },
    nutral: {
      up: "reverse",
      down: "drive",
      stop: "park",
    },
    drive: {
      up: "nutral",
      down: "second",
      stop: "park",
    },
    second: {
      up: "drive",
      down: "low",
      stop: "park",
    },
    low: {
      up: "second",
      stop: "park",
    },
  },
});

const pedals = createMachine({
  initial: "idle",
  context: {
    breakPreasure: 0,
    gasPreasure: 0,
  },
  states: {
    idle: {
      gas: "gas",
      break: "break",
    },
    gas: {
      stop: "idle",
      release: "idle",
      gas: "gas",
      break: "break",
    },
    break: {
      stop: "idle",
      release: "idle",
      gas: "gas",
      break: "break",
    },
  },
  events: {
    onChange: ({ value, context }, send) => {
      if (value === "gas" && context.breakPreasure > 0) {
        send("gas", { breakPreasure: 0 });
      }
      if (value === "break" && context.gasPreasure > 0) {
        send("break", { gasPreasure: 0 });
      }
    },
  },
});

export function Car() {
  const [m, { send, history }] = useMachines({
    wipersLever,
    turnSignalLever,
    transmission,
    pedals,
  });

  const createButtons = useCallback(
    (events: string[], send: any) =>
      events.map((event, i) => (
        <button key={event + i} onClick={() => send(event)}>
          {event}
        </button>
      )),
    []
  );

  const start = () => {
    if (
      Object.values(m)
        .map((machine) => machine.state.event)
        .includes("stop")
    ) {
      history.rewind();
    }
  };

  return (
    <Table
      data={[
        [
          "Master actions",
          null,
          [
            ...createButtons(["stop"], send),
            ...createButtons(["start"], () => start()),
          ],
        ],
        [
          "Turn signal lever",
          m.turnSignalLever.state.value,
          createButtons(["up", "down"], m.turnSignalLever.send),
        ],
        [
          "Wipers Lever",
          m.wipersLever.state.value,
          createButtons(["up", "down"], m.wipersLever.send),
        ],
        [
          "Transmission (auto)",
          m.transmission.state.value,
          createButtons(["up", "down"], m.transmission.send),
        ],
        [
          "Pedals",
          m.pedals.state.value,
          createButtons(["gas", "break", "release"], m.pedals.send),
        ],
      ]}
    />
  );
}
