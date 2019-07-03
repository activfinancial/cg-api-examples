/*
 * App component.
 */

import * as React from "react";
import { Component } from "react";
import Row from "react-bootstrap/Row";
import { Provider } from "react-redux";
import SplitPane from "react-split-pane";

import MainContainer from "./components/mainContainer";
import InputContainer from "./components/inputContainer";
import OutputContainer from "./components/outputContainer";

import { store } from "./state/store";
import { dispatchIsInternalNetworkAction } from "./state/actions/rootActions";

// ---------------------------------------------------------------------------------------------------------------------------------

interface Props {}

interface State {
    splitPaneSize?: string;
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
            splitPaneSize: undefined
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
                            size={this.state.splitPaneSize}
                            onChange={this.processSplitPaneChange}
                            onResizerDoubleClick={this.processSplitPaneDoubleClick}
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
    private static readonly initialSplitPaneSize = "50%";

    private getInitialSplitPaneWidth(): string | number {
        const split = localStorage.getItem(App.splitPaneKey);
        return split != null ? parseInt(split) : App.initialSplitPaneSize;
    }

    private readonly processSplitPaneChange = (newSize: number) => {
        localStorage.setItem(App.splitPaneKey, newSize.toString());

        if (this.state.splitPaneSize != null) {
            this.setState({
                splitPaneSize: undefined
            });
        }
    };

    private readonly processSplitPaneDoubleClick = (event: MouseEvent) => {
        // Remove any stored split position and force a re-render with a given size.
        localStorage.removeItem(App.splitPaneKey);

        this.setState({
            splitPaneSize: App.initialSplitPaneSize
        });
    };
}

export default App;
