import { createMachine, useMachine, combineMachines } from "../stateMachine";
import styled from "styled-components";

const Box = styled.div<{ active: boolean }>`
  border: none;
  cursor: pointer;
  height: 150px;
  width: 150px;
  background-color: ${({ active }) => (active ? "green" : "black")};
`;

const toggleSwitch = createMachine({
  id: "toggleSwitch",
  initial: "on",
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
const s1 = toggleSwitch.config({ initial: "on" });
const s2 = toggleSwitch.config({ initial: "off" });

const machine = combineMachines("multi-switch", { s1, s2 });

export function CombineMachines() {
  const [machines, { send }] = useMachine(machine);
  return (
    <>
      <Box active={machines.s1.state.value === "on"} />
      <Box active={machines.s2.state.value === "on"} />
      <button onClick={() => send("toggle")}>Toggle boxes</button>
    </>
  );
}
