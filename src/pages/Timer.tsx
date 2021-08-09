import { createMachine, useMachine } from "../stateMachine";
import styled from "styled-components";

const Form = styled.form`
  display: flex;
  flex-direction: column;

  & > * {
    margin-bottom: 5px;
    font-size: 1.2rem;
  }

  input,
  button {
    padding: 3px 5px;
  }
`;

const machine = createMachine({
  initial: "idle",
  context: {
    seconds: 0,
  },
  states: {
    idle: {
      edit: "idle",
      start: "countdown",
    },
    countdown: {
      tick: "countdown",
      finish: "ringing",
      stop: "idle",
    },
    ringing: {
      stop: "idle",
    },
  },
  events: {
    onChange: ({ value, context }, send) => {
      if (value === "countdown") {
        const id = window.setTimeout(() => {
          send(context.seconds > 0 ? "tick" : "finish", (c) => ({
            seconds: Math.max(c.seconds - 1, 0),
          }));
        }, 1000);

        return () => window.clearTimeout(id);
      }
    },
  },
});

export function Timer() {
  const { state, send } = useMachine(machine);
  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        send(state.value === "idle" ? "start" : "stop");
      }}
    >
      <label htmlFor="seconds">Seconds:</label>
      <input
        id="seconds"
        type="number"
        value={state.context.seconds}
        onChange={(e) => send("edit", { seconds: Number(e.target.value) })}
        disabled={state.value !== "idle"}
        style={
          state.value === "ringing"
            ? {
                borderColor: "red",
                borderStyle: "solid",
              }
            : undefined
        }
      />
      <button type="submit">{state.value === "idle" ? "start" : "stop"}</button>
    </Form>
  );
}
