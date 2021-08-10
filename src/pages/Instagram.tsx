import { createMachine, useMachine } from "../stateMachine";
import styled from "styled-components";

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getPosts(nextToken?: number) {
  await timeout(500);
  return {
    nextToken: nextToken ? nextToken + 1 : 0,
    posts: Array(5).fill(0).map(Math.random),
  };
}

const Feed = styled.div`
  display: flex;
  flex-direction: column;
`;

const Post = styled.div`
  height: 400px;
  width: 400px;
  background-color: black;
  margin-bottom: 10px;
  color: white;
`;

const machine = createMachine({
  id: "instagram",
  initial: "dehydrated",
  context: {
    posts: [] as number[],
    nextToken: null as number | null,
  },
  states: {
    // pretend this is for SSR
    dehydrated: {
      hydrate: "idle",
    },
    // user scrolling through feed
    idle: {
      loadMore: "loadingMore",
    },
    // client side fetch
    loadingMore: {
      loaded: "idle",
    },
  },
  events: {
    onChange: ({ value, context }, send) => {
      if (value === "dehydrated") {
        getPosts().then((res) => {
          send("hydrate", {
            posts: res.posts,
            nextToken: res.nextToken,
          });
        });
      }

      if (value === "loadingMore" && typeof context.nextToken === "number") {
        getPosts(context.nextToken).then((res) => {
          send("loaded", ({ posts }) => ({
            posts: [...posts, ...res.posts],
            nextToken: res.nextToken,
          }));
        });
      }
    },
  },
});

export function Instagram() {
  const { state, send } = useMachine(machine);
  return (
    <Feed>
      {state.context.posts.map((p) => (
        <Post key={p}>{p}</Post>
      ))}
      <button onClick={() => send("loadMore")}>Load more</button>
    </Feed>
  );
}
