import { BrowserRouter, Switch, Route, Link } from "react-router-dom";
import * as Pages from "./pages";
import styled from "styled-components";
import { use100vh } from "react-div-100vh";

const FlexRow = styled.div`
  display: flex;
  flex-direction: ro;
`;

const SidebarWrap = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #000;
  padding: 10px 30px;
  position: sticky;
  top: 0;
  min-width: 200px;

  * {
    color: #fff;
    margin-bottom: 10px;
  }
`;

const Page = styled.div`
  padding: 30px;
`;

const routes = {
  "/toggle-switch": Pages.ToggleSwitch,
  "/traffic-light": Pages.TrafficLight,
  "/timer": Pages.Timer,
  "/instagram": Pages.Instagram,
  "/activity-indicator": Pages.ActivityIndicator,
  "/combine-machines": Pages.CombineMachines,
  "/car": Pages.Car,
};

function Sidebar() {
  const sidebarHeight = use100vh();
  return (
    <SidebarWrap style={{ height: sidebarHeight ?? "100vh" }}>
      <h3>Routes</h3>
      {Object.keys(routes).map((path) => (
        <Link to={path} key={path}>
          {path}
        </Link>
      ))}
    </SidebarWrap>
  );
}

function App() {
  return (
    <BrowserRouter>
      <FlexRow>
        <Sidebar />
        <Page>
          <Switch>
            {Object.entries(routes).map(([path, Component]) => (
              <Route path={path} key={path} exact>
                <Component />
              </Route>
            ))}
          </Switch>
        </Page>
      </FlexRow>
    </BrowserRouter>
  );
}

export default App;
