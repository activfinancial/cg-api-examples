/*
 * App component.
 */

import * as React from "react";
import { Component } from "react";
import Row from "react-bootstrap/Row";
import { Provider } from "react-redux";
import SplitPane from "react-split-pane";
import uuid from "uuid/v4";

import MainContainer from "./components/mainContainer";
import InputContainer from "./components/inputContainer";
import OutputContainer from "./components/outputContainer";

import { store } from "./state/store";
import { dispatchIsInternalNetworkAction } from "./state/actions/rootActions";

// ---------------------------------------------------------------------------------------------------------------------------------

interface Props {}

interface State {
    splitPaneKey: string;
}

class App extends Component<Props, State> {
    // static whyDidYouRender = true;

    private static readonly mainDivStyle: React.CSSProperties = {
        height: "100vh",
        overflowY: "hidden"
    };

    private static readonly mainRowStyle: React.CSSProperties = {
        height: "100%",
        flexWrap: "nowrap"
    };

    constructor(props: Props) {
        super(props);

        this.state = {
            splitPaneKey: uuid()
        };

        // Fire off a test for being on ACTIV internal network.
        const xhr = new XMLHttpRequest();

        // Only resolve to true if the HEAD returns 200. Anything else or errors, assume false.
        // Try to avoid any caching, as we're sensitive to the exact CORS header in a response.
        xhr.onload = () => store.dispatch(dispatchIsInternalNetworkAction(true));

        try {
            xhr.open("HEAD", `${location.protocol}//scm1-cam.activfinancial.com`);
            xhr.setRequestHeader("cache-control", "no-cache, no-store, must-revalidate");
            xhr.send();
        } catch {}
    }

    render() {
        return (
            <Provider store={store}>
                <MainContainer style={App.mainDivStyle} className="App container-fluid">
                    <Row style={App.mainRowStyle}>
                        <SplitPane
                            className="pt-1"
                            resizerClassName="main-split-pane-resizer"
                            split="vertical"
                            defaultSize={this.getInitialSplitPaneWidth()}
                            onChange={this.processSplitPaneChange}
                            onResizerDoubleClick={this.processSplitPaneDoubleClick}
                            key={this.state.splitPaneKey}
                        >
                            <InputContainer />
                            <OutputContainer />
                        </SplitPane>
                    </Row>
                </MainContainer>
            </Provider>
        );
    }

    private static readonly splitPaneKey = "cgApiExplorerMainSplitPane";

    private getInitialSplitPaneWidth(): string | number {
        const split = localStorage.getItem(App.splitPaneKey);
        return split != null ? parseInt(split) : "50%";
    }

    private readonly processSplitPaneChange = (newSize: number) => {
        localStorage.setItem(App.splitPaneKey, newSize.toString());
    };

    private readonly processSplitPaneDoubleClick = (event: MouseEvent) => {
        // Remove any stored split position and force a re-render, which will reset to default value.
        localStorage.removeItem(App.splitPaneKey);

        this.setState({
            splitPaneKey: uuid()
        });
    };
}

export default App;
