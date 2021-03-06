/*
 * Controls at the top of the input display.
 */

import * as React from "react";
import { connect } from "react-redux";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Dropdown from "react-bootstrap/Dropdown";
import uuid from "uuid/v4";

import { ConnectionInfo } from "../connectionInfo";
import ConnectionStatus from "./connectionStatus";
import SimpleTooltip from "./simpleTooltip";
import { repository, name as packageName, version as packageVersion } from "../../package.json";

import { AppState, saveStateToClipboard } from "../state/store";
import { dispatchToggleGlobalCollapse } from "../state/actions/rootActions";

// ---------------------------------------------------------------------------------------------------------------------------------

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps {
    isInternalNetwork: boolean;
    globalCollapseState: boolean;
    connectionInfo: ConnectionInfo;
}

// Redux dispatch functions we use.
const mapDispatchToProps = {
    dispatchToggleGlobalCollapse
};

// All props.
type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

// Strip off any package scope.
const versionText = `${packageName.replace(/\S+\//, "")} ${packageVersion}`;

class Component extends React.Component<Props> {
    render() {
        // Note top-level div is to avoid parent Row's flex values messing up ours.
        return (
            <div>
                <Row id="inputControlsBar" className="pl-1">
                    <Col>
                        <ConnectionStatus />

                        <SimpleTooltip text={this.props.globalCollapseState ? "Expand all sections" : "Collapse all sections"}>
                            <Button
                                className="float-right"
                                variant="outline-primary"
                                size="sm"
                                onClick={this.props.dispatchToggleGlobalCollapse}
                            >
                                <span
                                    className={`fas ${
                                        this.props.globalCollapseState ? "fa-angle-double-down" : "fa-angle-double-up"
                                    }`}
                                />
                            </Button>
                        </SimpleTooltip>

                        <SimpleTooltip text="Copy a URL encoded with current application state to the clipboard">
                            <Button className="float-right" variant="outline-primary" size="sm" onClick={saveStateToClipboard}>
                                <span className="fas fa-share-alt" />
                            </Button>
                        </SimpleTooltip>

                        <Dropdown className="float-right">
                            <SimpleTooltip text="Menu">
                                <Dropdown.Toggle id={this.dropdownId} variant="outline-primary" size="sm">
                                    <span className="fas fa-bars" aria-hidden="true" />
                                </Dropdown.Toggle>
                            </SimpleTooltip>

                            <Dropdown.Menu>
                                <Dropdown.Header>{versionText}</Dropdown.Header>
                                <Dropdown.Divider />

                                <Dropdown.Item href={repository.url} target="_blank">
                                    Source code
                                </Dropdown.Item>

                                <Dropdown.Item href={`${repository.url}/issues`} target="_blank">
                                    Report issue
                                </Dropdown.Item>

                                {this.props.isInternalNetwork && this.props.connectionInfo.hostname !== "" && (
                                    <>
                                        <Dropdown.Item
                                            href={`https://web1-tlx.activfinancial.com/live/clientinfo/quick-search?s=${this.props.connectionInfo.hostname}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {this.props.connectionInfo.hostname} on CIDB
                                        </Dropdown.Item>
                                    </>
                                )}
                            </Dropdown.Menu>
                        </Dropdown>
                    </Col>
                </Row>
            </div>
        );
    }

    private readonly dropdownId = uuid();
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        isInternalNetwork: state.root.isInternalNetwork,
        globalCollapseState: state.root.globalCollapseState,
        connectionInfo: state.root.connectionInfo
    };
}

// Generate redux connected component.
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Component);
