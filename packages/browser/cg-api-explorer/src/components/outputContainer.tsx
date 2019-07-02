/*
 * Container for output side of display.
 */

import * as React from "react";
import Col from "react-bootstrap/Col";

import * as OutputControlsBar from "./outputControlsBar";
import OutputDisplay from "./outputDisplay";

// ---------------------------------------------------------------------------------------------------------------------------------

class Component extends React.Component<{}> {
    private static readonly style: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        height: "100%"
    };

    render() {
        return (
            <Col style={Component.style}>
                <OutputControlsBar.Component />
                <OutputDisplay className="mt-1" />
            </Col>
        );
    }
}

export default Component;
