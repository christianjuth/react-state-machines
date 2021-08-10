import { BrowserRouter, Switch, Route, Link, Redirect } from "react-router-dom";
import * as Pages from "./pages";
import styled from "styled-components";
import { use100vh } from "react-div-100vh";
import { useState } from "react";
import { Provider as MachineProvider } from "./stateMachine";

const MOBILE_MEDIA_QUERY = "only screen and (max-width: 600px)";
const PAGE_SPACING = "calc(1.5vw + 15px)";

const Page = styled.div`
  display: flex;
  flex-direction: row;

  @media ${MOBILE_MEDIA_QUERY} {
    flex-direction: column;
  }
`;

const SidebarWrap = styled.div<{ height: number | null }>`
  display: flex;
  flex-direction: column;
  background-color: #000;
  padding: 10px 30px;
  position: sticky;
  top: 0;
  min-width: 200px;
  height: ${({ height }) => (height ? height + "px" : "100vh")};

  * {
    color: #fff;
    margin-bottom: 10px;
  }

  @media ${MOBILE_MEDIA_QUERY} {
    display: none;
  }
`;

const MobileNavBarWrap = styled.div`
  background-color: black;
  padding: ${PAGE_SPACING};
  display: none;

  * {
    color: #fff;
    padding: 0;
    margin: 0;
  }

  @media ${MOBILE_MEDIA_QUERY} {
    display: flex;
  }
`;

const MobileMenu = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: black;
  display: flex;
  flex-direction: column;
  padding: ${PAGE_SPACING};
  justify-content: center;

  * {
    color: #fff;
    margin-bottom: 10px;
  }
`;

const Content = styled.div`
  padding: ${PAGE_SPACING};
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
    <SidebarWrap height={sidebarHeight}>
      <h3>Routes</h3>
      {Object.keys(routes).map((path) => (
        <Link to={path} key={path}>
          {path}
        </Link>
      ))}
    </SidebarWrap>
  );
}

function MobileNav() {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <>
      <MobileNavBarWrap>
        <h3>State Machines</h3>
        <button onClick={() => setShowMenu((v) => !v)}>Toggle</button>
      </MobileNavBarWrap>
      {showMenu && (
        <MobileMenu>
          <h3>Routes</h3>
          {Object.keys(routes).map((path) => (
            <Link to={path} key={path}>
              {path}
            </Link>
          ))}
          <button style={{ position: "absolute", top: 0 }}>Close</button>
        </MobileMenu>
      )}
    </>
  );
}

function App() {
  return (
    <MachineProvider>
      <BrowserRouter>
        <Page>
          <MobileNav />
          <Sidebar />
          <Content>
            <Switch>
              <Redirect from="/" to={Object.keys(routes)[0]} exact />
              {Object.entries(routes).map(([path, Component]) => (
                <Route path={path} key={path} exact>
                  <Component />
                </Route>
              ))}
            </Switch>
          </Content>
        </Page>
      </BrowserRouter>
    </MachineProvider>
  );
}

export default App;
