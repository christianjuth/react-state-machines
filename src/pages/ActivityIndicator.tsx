import { useEffect, useState } from "react";
import { createMachine, useMachine } from "../stateMachine";

const SHOW_SPINNER_DELAY = 750;

const machine = createMachine({
  id: "activityIndicator",
  initial: "showSpinner",
  context: {},
  states: {
    idle: {
      loading: "showStale",
    },
    showStale: {
      timer: "showSpinner",
      loaded: "idle",
    },
    showSpinner: {
      loaded: "idle",
    },
  },
  events: {
    onChange: ({ value }, send) => {
      if (value === "showStale") {
        const id = window.setTimeout(() => send("timer"), SHOW_SPINNER_DELAY);
        return () => window.clearTimeout(id);
      }
    },
  },
});

function Indicator({
  loading,
  children,
}: {
  loading: boolean;
  children?: JSX.Element | JSX.Element[];
}) {
  const { state, send } = useMachine(machine);

  useEffect(() => {
    send(loading ? "loading" : "loaded");
  }, [loading, send]);

  if (state.value === "showSpinner") {
    return <p>Loading...</p>;
  }

  return <>{children}</>;
}

export function ActivityIndicator() {
  const [loading, setLoading] = useState(true);
  return (
    <>
      <Indicator loading={loading}>
        <p>Content</p>
      </Indicator>
      <button onClick={() => setLoading((l) => !l)}>
        Toggle loading: {loading + ""}
      </button>
    </>
  );
}
