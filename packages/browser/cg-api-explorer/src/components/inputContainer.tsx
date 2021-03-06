/*
 * Input container. Contains all request and management uis.
 */

import * as React from "react";
import { connect } from "react-redux";
import Alert from "react-bootstrap/Alert";

import InputControlsBar from "./inputControlsBar";
import { Component as ConnectionManagementSection } from "./sections/connectionManagementSection";
import SnapshotsAndStreaming from "./sections/snapshotsAndStreamingSection";
import SymbolDirectorySection from "./sections/symbolDirectorySection";
import TimeSeriesSection from "./sections/timeSeriesSection";
import NewsSection from "./sections/newsSection";
import { Component as SubscriptionManagementSection } from "./sections/subscriptionManagementSection";
import MetaDataSection from "./sections/metaDataSection";

import { AppState } from "../state/store";
import { ServerMessage } from "../state/reducers/rootReducer";
import { dispatchRemoveServerMessage } from "../state/actions/rootActions";

// ---------------------------------------------------------------------------------------------------------------------------------

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps {
    isInternalNetwork: boolean;
    serverMessages: ServerMessage[];
}

// Redux dispatch functions we use.
const mapDispatchToProps = {
    dispatchRemoveServerMessage
};

// All props.
type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

class Component extends React.PureComponent<Props> {
    // static whyDidYouRender = true;

    private static readonly style: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%"
    };

    private static readonly collapsibleSectionsStyle: React.CSSProperties = {
        overflowY: "scroll",
        flex: 1
    };

    private static readonly alertClassList = "ml-1 mx-1 mb-1 pl-2 pt-2 pb-1 input-container-alert";

    render() {
        return (
            <div style={Component.style} className="input-container">
                <InputControlsBar />
                <div style={Component.collapsibleSectionsStyle} className="mt-1">
                    {this.props.isInternalNetwork && (
                        <Alert className={Component.alertClassList} variant="primary">
                            <Alert.Heading>
                                This is beta software! Please report issues{" "}
                                <Alert.Link
                                    href="https://scm1-cam.activfinancial.com/gitea/ACTIV/cg-api-examples/issues"
                                    target="_blank"
                                >
                                    here
                                </Alert.Link>
                                .
                            </Alert.Heading>
                        </Alert>
                    )}
                    {this.props.serverMessages.map((serverMessage: ServerMessage) => (
                        <Alert
                            className={Component.alertClassList}
                            variant="danger"
                            dismissible
                            key={serverMessage.key}
                            onClose={() => this.props.dispatchRemoveServerMessage(serverMessage.key)}
                        >
                            <Alert.Heading>
                                <strong>Message from ContentGateway:</strong>
                            </Alert.Heading>
                            <h4>{serverMessage.message}</h4>
                        </Alert>
                    ))}

                    <ConnectionManagementSection />
                    <SubscriptionManagementSection />
                    <SnapshotsAndStreaming />
                    <SymbolDirectorySection />
                    <TimeSeriesSection />
                    <NewsSection />
                    <MetaDataSection />
                </div>
            </div>
        );
    }
}

// TODO can we make this just apply to the state sub-tree we are interested in??
function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        isInternalNetwork: state.root.isInternalNetwork,
        serverMessages: state.root.serverMessages
    };
}

// Generate redux connected component.
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Component);
