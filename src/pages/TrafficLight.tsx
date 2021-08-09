import { createMachine, useMachine } from "../stateMachine";
import styled from "styled-components";

const Light = styled.button`
  background-color: black;
  display: flex;
  flex-direction: column;
  padding: 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;

  & > *:not(:last-child) {
    margin-bottom: 10px;
  }
`;

const Circle = styled.div`
  height: 50px;
  width: 50px;
  border-radius: 50px;
`;

const machine = createMachine({
  id: "trafficLight",
  initial: "green",
  context: {},
  states: {
    green: {
      change: "yellow",
    },
    yellow: {
      change: "red",
    },
    red: {
      change: "green",
    },
  },
  events: {
    onChange: ({ value }, send) => {
      const id = window.setTimeout(
        () => {
          send("change");
        },
        value === "yellow" ? 2000 : 4000
      );

      return () => {
        window.clearTimeout(id);
      };
    },
  },
});

export function TrafficLight() {
  const { state, send } = useMachine(machine);
  return (
    <>
      <Light onClick={() => send("change")}>
        {["red", "yellow", "green"].map((color) => (
          <Circle
            key={color}
            style={{
              backgroundColor:
                state.value === color ? color : "rgb(255 255 255 / 15%)",
            }}
          />
        ))}
      </Light>
    </>
  );
}
