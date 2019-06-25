/*
 * Container for output side of display.
 */

import * as React from "react";

import * as OutputControlsBar from "./outputControlsBar";
import OutputDisplay from "./outputDisplay";

// ---------------------------------------------------------------------------------------------------------------------------------

class Component extends React.Component<{}> {
    private static readonly style: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        flex: 1
    };

    // TODO redo this with Col/Row only?

    render() {
        return (
            <div style={Component.style}>
                <OutputControlsBar.Component />
                <OutputDisplay className="mt-1" />
            </div>
        );
    }
}

export default Component;
