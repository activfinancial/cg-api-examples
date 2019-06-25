/*
 * Connection status badge.
 */

import * as React from "react";
import { connect } from "react-redux";
import Badge from "react-bootstrap/Badge";

import { ConnectionInfo, ConnectionState } from "../connectionInfo";
import { AppState } from "../state/store";

// ---------------------------------------------------------------------------------------------------------------------------------

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps {
    connectionInfo: ConnectionInfo;
}

// All props.
type Props = OwnProps & ReduxStateProps;

class Component extends React.PureComponent<Props> {
    private static readonly style: React.CSSProperties = {
        textAlign: "left",
        whiteSpace: "normal",
        height: "100%"
    };

    render() {
        switch (this.props.connectionInfo.connectionState) {
            case ConnectionState.disconnected:
                return this.renderBadge("secondary", "Disconnected");

            case ConnectionState.connecting:
                return this.renderBadge("info", "Connecting...");

            case ConnectionState.connected:
                return this.renderBadge("success", "Connected");

            default:
                return null;
        }
    }

    private renderBadge(variant: string, text: string) {
        const render = (variant: string, text: string) => (
            <Badge className="connection-status" style={Component.style} variant={variant as any}>
                {text}
            </Badge>
        );

        const statusText = this.props.connectionInfo.statusText;

        // NB: statusText for error conditions will be ConnectionState.disconnected, hence we don't
        // need a separate "variant" in ConnectionInfo; we can figure it out.
        if (statusText && statusText.length) {
            return render(
                ConnectionState.disconnected === this.props.connectionInfo.connectionState ? "danger" : variant,
                statusText
            );
        } else {
            return render(variant, text);
        }
    }
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        connectionInfo: state.root.connectionInfo
    };
}

// Generate redux connected component.
export default connect(mapStateToProps)(Component);
