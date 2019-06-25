/*
 * Metadata section.
 */

import * as React from "react";
import { connect } from "react-redux";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import uuid from "uuid/v4";

import { Component as CollapsibleSection } from "./collapsibleSection";
import SimpleTooltip from "../simpleTooltip";

import GetApiInfo from "../metaData/getApiInfo";
import GetContentGatewayInfo from "../metaData/getContentGatewayInfo";
import * as GetSubscriptionInfo from "../metaData/getSubscriptionInfo";
import GetPermissionInfo from "../metaData/getPermissionInfo";
import * as GetTableInfo from "../metaData/getTableInfo";
import * as GetRelationshipInfo from "../metaData/getRelationshipInfo";
import * as GetFieldInfo from "../metaData/getFieldInfo";
import * as GetExchangeInfo from "../metaData/getExchangeInfo";

import { AppState } from "../../state/store";
import { dispatchSetMetaDataTab } from "../../state/actions/metaDataActions";

// ---------------------------------------------------------------------------------------------------------------------------------

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps {
    activeTab: string;
}

// Redux dispatch functions we use.
const mapDispatchToProps = {
    dispatchSetMetaDataTab
};

// All props.
type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

class Component extends React.PureComponent<Props> {
    render() {
        return (
            <Col>
                <CollapsibleSection title="Metadata" initialCollapseState={true}>
                    {/* Note we're not using the <Tabs> component to allow <SimpleTooltip> on the tab header itself. */}
                    <Tab.Container id={`${this.id}-tabs`} defaultActiveKey={this.props.activeTab} transition={false}>
                        <Nav variant="tabs" onSelect={this.props.dispatchSetMetaDataTab}>
                            <SimpleTooltip text="Get API version information">
                                <Nav.Item>
                                    <Nav.Link eventKey="getApiInfo">API</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get ContentGateway information">
                                <Nav.Item>
                                    <Nav.Link eventKey="getContentGatewayInfo">CG</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get subscription information">
                                <Nav.Item>
                                    <Nav.Link eventKey="getSubscriptionInfo">Subscriptions</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get permission information">
                                <Nav.Item>
                                    <Nav.Link eventKey="getPermissionInfo">Permissions</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get table information">
                                <Nav.Item>
                                    <Nav.Link eventKey="getTableInfo">Tables</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get relationship information">
                                <Nav.Item>
                                    <Nav.Link eventKey="getRelationshipInfo">Relationships</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get field information">
                                <Nav.Item>
                                    <Nav.Link eventKey="getFieldInfo">Fields</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get exchange information">
                                <Nav.Item>
                                    <Nav.Link eventKey="getExchangeInfo">Exchanges</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>
                        </Nav>

                        <Card body bg="light">
                            <Tab.Content>
                                {/* I'm not sure this is really cricket, but if we render the inactive tabs
                                then any required fields on the inactive tabs will stop the active tab
                                from working with an odd error in the console (since presumably it can't
                                render the normal please-fill-in-this-field popup). */}

                                {this.props.activeTab === "getApiInfo" && (
                                    <Tab.Pane eventKey="getApiInfo">
                                        <GetApiInfo />
                                    </Tab.Pane>
                                )}

                                {this.props.activeTab === "getContentGatewayInfo" && (
                                    <Tab.Pane eventKey="getContentGatewayInfo">
                                        <GetContentGatewayInfo />
                                    </Tab.Pane>
                                )}

                                {this.props.activeTab === "getSubscriptionInfo" && (
                                    <Tab.Pane eventKey="getSubscriptionInfo">
                                        <GetSubscriptionInfo.Component />
                                    </Tab.Pane>
                                )}

                                {this.props.activeTab === "getPermissionInfo" && (
                                    <Tab.Pane eventKey="getPermissionInfo">
                                        <GetPermissionInfo />
                                    </Tab.Pane>
                                )}

                                {this.props.activeTab === "getTableInfo" && (
                                    <Tab.Pane eventKey="getTableInfo">
                                        <GetTableInfo.Component />
                                    </Tab.Pane>
                                )}

                                {this.props.activeTab === "getRelationshipInfo" && (
                                    <Tab.Pane eventKey="getRelationshipInfo">
                                        <GetRelationshipInfo.Component />
                                    </Tab.Pane>
                                )}

                                {this.props.activeTab === "getFieldInfo" && (
                                    <Tab.Pane eventKey="getFieldInfo">
                                        <GetFieldInfo.Component />
                                    </Tab.Pane>
                                )}

                                {this.props.activeTab === "getExchangeInfo" && (
                                    <Tab.Pane eventKey="getExchangeInfo">
                                        <GetExchangeInfo.Component />
                                    </Tab.Pane>
                                )}
                            </Tab.Content>
                        </Card>
                    </Tab.Container>
                </CollapsibleSection>
            </Col>
        );
    }

    private readonly id = uuid();
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        activeTab: state.metaData.activeTab
    };
}

// Generate redux connected component.
export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Component);
