import { createMachine, useMachine, combineMachines } from "../stateMachine";
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
  id: "wipersLever",
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
  id: "turnSignalLever",
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
  id: "transmission",
  initial: "park",
  context: {},
  states: {
    park: {
      down: "reverse",
    },
    reverse: {
      up: "park",
      down: "nutral",
    },
    nutral: {
      up: "reverse",
      down: "drive",
    },
    drive: {
      up: "nutral",
      down: "second",
    },
    second: {
      up: "drive",
      down: "low",
    },
    low: {
      up: "second",
    },
  },
});

const pedals = createMachine({
  id: "pedals",
  initial: "idle",
  context: {},
  states: {
    idle: {
      gas: "gas",
      break: "break",
    },
    gas: {
      stop: "idle",
      gas: "idle",
      break: "break",
    },
    break: {
      stop: "idle",
      gas: "gas",
      break: "idle",
    },
  },
});

const car = combineMachines("car", {
  wipersLever,
  turnSignalLever,
  transmission,
  pedals,
});

export function Car() {
  const [m, { send, history }] = useMachine(car, true);

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
    // any machines that can be stopped
    // should resume where they left off
    history.undo((s: any) => s.event === "stop");
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
          createButtons(["gas", "break"], m.pedals.send),
        ],
      ]}
    />
  );
}
