/*
 * Main div for App. Just adds pending cursor when requests in flight.
 */

import * as React from "react";
import { connect } from "react-redux";

import { AppState } from "../state/store";

// ---------------------------------------------------------------------------------------------------------------------------------

// Own props.
interface OwnProps {
    style?: React.CSSProperties;
    className?: string;
}

// Props from Redux state.
interface ReduxStateProps {
    numberOfPendingRequests: number;
}

// All props.
type Props = OwnProps & ReduxStateProps;

class Component extends React.Component<Props> {
    render() {
        const style: React.CSSProperties = {
            ...this.props.style,
            cursor: this.props.numberOfPendingRequests > 0 ? "progress" : "inherit"
        };

        return (
            <div className={this.props.className} style={style}>
                {this.props.children}
            </div>
        );
    }
}

// Generate props from redux state.
function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        numberOfPendingRequests: state.outputContainer.numberOfPendingRequests
    };
}

// Generate redux connected component.
export default connect(mapStateToProps)(Component);
