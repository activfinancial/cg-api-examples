/*
 * Output display.
 */

import * as React from "react";
import { connect } from "react-redux";
import ReactDOM from "react-dom";
import Row from "react-bootstrap/Row";

import { AppState } from "../state/store";

// ---------------------------------------------------------------------------------------------------------------------------------

// Own props.
interface OwnProps {
    className?: string;
}

// Redux state we'll see as props.
interface ReduxStateProps {
    output: React.ReactElement[];
}

// All props.
type Props = OwnProps & ReduxStateProps;

// TODO I'm not sure this is the most efficient. We're always re-rendering the entire display on a
// state change?
// Can we make it just append, effectively?

class ComponentImpl extends React.PureComponent<Props> {
    private static readonly preStyle: React.CSSProperties = {
        display: "block",
        flex: 1,
        padding: "0.5rem",
        overflowX: "auto",
        overflowY: "scroll",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        wordWrap: "break-word"
    };

    render() {
        return (
            <Row as="pre" ref={this.ref} style={ComponentImpl.preStyle} className="output-display mt-1 mb-0">
                {this.props.output}
            </Row>
        );
    }

    getSnapshotBeforeUpdate() {
        if (this.ref.current) {
            const domElement = ReactDOM.findDOMNode(this.ref.current) as HTMLPreElement;

            if (domElement != null) {
                const wasScrolledToBottom = domElement.scrollTop >= domElement.scrollHeight - domElement.clientHeight;

                // This gets passed in to componentDidUpdate() as last parameter.
                if (wasScrolledToBottom) {
                    return domElement;
                }
            }
        }

        return null;
    }

    componentDidUpdate(prevProps: Props, prevState: {}, domElement: HTMLElement | null) {
        if (domElement) {
            // Keep the element scrolled to the bottom as it was previous to this update.
            domElement.scrollTop = domElement.scrollHeight;
        }
    }

    // TODO ugh what is the type? Row<"pre"> complains.
    private readonly ref = React.createRef<Row<any>>();
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return { output: state.outputContainer.output };
}

// Generate redux connected component.
export default connect(mapStateToProps)(ComponentImpl);
