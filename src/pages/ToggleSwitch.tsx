import { createMachine, useMachine } from "../stateMachine";
import styled from "styled-components";

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 2rem;
  cursor: pointer;
`;

const machine = createMachine({
  initial: "off",
  context: {},
  states: {
    on: {
      toggle: "off",
    },
    off: {
      toggle: "on",
    },
  },
});

export function ToggleSwitch() {
  const { state, send } = useMachine(machine);

  return (
    <Button
      onClick={() => send("toggle")}
      style={
        state.value === "on"
          ? {
              backgroundColor: "green",
              color: "white",
            }
          : {}
      }
    >
      {state.value}
    </Button>
  );
}
