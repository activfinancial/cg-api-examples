/*
 * App component.
 */

import * as React from "react";
import { Component } from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { Provider } from "react-redux";

import MainContainer from "./components/mainContainer";
import InputContainer from "./components/inputContainer";
import OutputContainer from "./components/outputContainer";

import { store } from "./state/store";
import { dispatchIsInternalNetworkAction } from "./state/actions/rootActions";

// ---------------------------------------------------------------------------------------------------------------------------------

interface Props {}

class App extends Component<Props> {
    // static whyDidYouRender = true;

    private static readonly mainDivStyle: React.CSSProperties = {
        height: "100vh",
        overflowY: "hidden"
    };

    private static readonly mainRowStyle: React.CSSProperties = {
        height: "100%",
        flexWrap: "nowrap"
    };

    private static readonly inputColumnStyle: React.CSSProperties = {
        paddingLeft: 0,
        paddingRight: 0,
        display: "flex"
    };

    private static readonly outputColumnStyle: React.CSSProperties = {
        display: "flex"
    };

    constructor(props: Props) {
        super(props);

        // Fire off a test for being on ACTIV internal network.
        const xhr = new XMLHttpRequest();

        // Only resolve to true if the HEAD returns 200. Anything else or errors, assume false.
        xhr.onload = () => store.dispatch(dispatchIsInternalNetworkAction(true));

        try {
            xhr.open("HEAD", `${location.protocol}//scm1-cam.activfinancial.com`);
            xhr.send();
        } catch {}
    }

    render() {
        return (
            <Provider store={store}>
                <MainContainer style={App.mainDivStyle} className="App container-fluid pt-1">
                    <Row style={App.mainRowStyle}>
                        <Col style={App.inputColumnStyle} sm={6}>
                            <InputContainer />
                        </Col>
                        <Col style={App.outputColumnStyle} sm={6}>
                            <OutputContainer />
                        </Col>
                    </Row>
                </MainContainer>
            </Provider>
        );
    }
}

export default App;
