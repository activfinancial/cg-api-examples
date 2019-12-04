/*
 * Snapshot and streaming section.
 */

import * as React from "react";
import { connect } from "react-redux";
import Button from "react-bootstrap/Button";
import Tab from "react-bootstrap/Tab";
import Nav from "react-bootstrap/Nav";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import uuid from "uuid/v4";

import * as EventTypesControl from "../controls/eventTypesControl";
import SubscriptionTypeControl from "../snapshotsAndStreaming/subscriptionType";
import { Component as ConflationParametersControl } from "../snapshotsAndStreaming/conflationParametersControl";
import Relationship from "../snapshotsAndStreaming/relationship";
import { Component as PermissionLevelControl } from "../controls/permissionLevelControl";
import AliasModeControl from "../snapshotsAndStreaming/aliasMode";

import { Component as GetEqual } from "../snapshotsAndStreaming/getEqual";
import { Component as GetMatch } from "../snapshotsAndStreaming/getMatch";
import { Component as GetPattern } from "../snapshotsAndStreaming/getPattern";
import { Component as GetFirstLast } from "../snapshotsAndStreaming/getFirstLast";
import { Component as GetNextPrevious } from "../snapshotsAndStreaming/getNextPrevious";

import * as MakeRequest from "../makeRequest";
import { Component as CollapsibleSection } from "./collapsibleSection";
import SimpleTooltip from "../simpleTooltip";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";
import { ConnectionInfo, ConnectionState } from "../../connectionInfo";
import { formatDate, renderUpdate, renderDynamicConflationInfo } from "../../outputFormatters";

import { AppState } from "../../state/store";
import { State as SnapshotsAndStreamingState } from "../../state/reducers/snapshotsAndStreamingReducer";
import {
    dispatchSetSnapshotsAndStreamingTab,
    dispatchAddRelationship,
    dispatchUpdateRelationship,
    dispatchRemoveRelationship,
    dispatchAddSymbolId,
    dispatchUpdateSymbolId,
    dispatchRemoveSymbolId,
    dispatchUpdateSnapshotsAndStreaming
} from "../../state/actions/snapshotsAndStreamingActions";
import { dispatchAddSubscriptionInfo, dispatchRemoveSubscriptionInfo } from "../../state/actions/subscriptionManagementActions";

import { IClient, PermissionLevel, RelationshipId, Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps extends SnapshotsAndStreamingState {
    client: IClient | null;
    connectionInfo: ConnectionInfo;
}

// Redux dispatch functions we use.
const mapDispatchToProps = {
    dispatchSetSnapshotsAndStreamingTab,
    dispatchAddRelationship,
    dispatchUpdateRelationship,
    dispatchRemoveRelationship,
    dispatchAddSymbolId,
    dispatchUpdateSymbolId,
    dispatchRemoveSymbolId,
    dispatchUpdateSnapshotsAndStreaming,
    dispatchAddSubscriptionInfo,
    dispatchRemoveSubscriptionInfo
};

// All props.
type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

interface MakeRequestParameters {
    (): Streaming.IAllRequestParameters;
}

/** Request parameter builders keyed by request name. */
type RequestParametersBuilder = { [requestName in Streaming.AllRequestNames]: MakeRequestParameters };

class ComponentImpl extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);

        this.requestParametersBuilder = {
            getEqual: () => this.makeGetEqualParameters(),
            getMatch: () => this.makeGetMatchParameters(),
            getPattern: () => this.makeGetPatternParameters(),
            getFirst: () => this.makeGetFirstLastParameters(),
            getLast: () => this.makeGetFirstLastParameters(),
            getNext: () => this.makeGetNextPreviousParameters(),
            getPrevious: () => this.makeGetNextPreviousParameters()
        };
    }

    render() {
        return (
            <Col>
                <CollapsibleSection title="Snapshots and Streaming" initialCollapseState={false}>
                    {/* Note we're not using the <Tabs> component for two reasons:
                        1. To allow <SimpleTooltip> on the tab header itself.
                        2. To allow a single common section, rather than rendering a different one per tab. */}
                    <Tab.Container id={`${this.id}-tabs`} defaultActiveKey={this.props.activeTab} transition={false}>
                        <Nav variant="tabs" onSelect={this.props.dispatchSetSnapshotsAndStreamingTab}>
                            <SimpleTooltip text="Get record by exact symbol">
                                <Nav.Item>
                                    <Nav.Link eventKey="getEqual">Equal</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get records by symbol, with optional exchange code">
                                <Nav.Item>
                                    <Nav.Link eventKey="getMatch">Match</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get records by table number and symbol pattern">
                                <Nav.Item>
                                    <Nav.Link eventKey="getPattern">Pattern</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get first N records in a table">
                                <Nav.Item>
                                    <Nav.Link eventKey="getFirst">First</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get next N records after a symbol">
                                <Nav.Item>
                                    <Nav.Link eventKey="getNext">Next</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get last N records in a table">
                                <Nav.Item>
                                    <Nav.Link eventKey="getLast">Last</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>

                            <SimpleTooltip text="Get previous N records before a symbol">
                                <Nav.Item>
                                    <Nav.Link eventKey="getPrevious">Previous</Nav.Link>
                                </Nav.Item>
                            </SimpleTooltip>
                        </Nav>

                        <Card className="tab-body-card" body bg="light">
                            <Form onSubmit={this.processSubmit}>
                                <Tab.Content>
                                    {/* I'm not sure this is really cricket, but if we render the inactive tabs
                                    then any required fields on the inactive tabs will stop the active tab
                                    from working with an odd error in the console (since presumably it can't
                                    render the normal please-fill-in-this-field popup). */}

                                    {this.props.activeTab === "getEqual" && (
                                        <Tab.Pane eventKey="getEqual">
                                            <GetEqual symbolList={this.props.symbolList} onChange={this.onChange} />
                                        </Tab.Pane>
                                    )}

                                    {this.props.activeTab === "getMatch" && (
                                        <Tab.Pane eventKey="getMatch">
                                            <GetMatch
                                                matchType={this.props.matchType}
                                                alwaysGetMatch={this.props.alwaysGetMatch}
                                                symbolList={this.props.symbolList}
                                                onChange={this.onChange}
                                            />
                                        </Tab.Pane>
                                    )}

                                    {this.props.activeTab === "getPattern" && (
                                        <Tab.Pane eventKey="getPattern">
                                            <GetPattern
                                                symbolIdList={this.props.symbolIdList}
                                                reverseOrder={this.props.reverseOrder}
                                                addSymbolId={this.props.dispatchAddSymbolId}
                                                updateSymbolId={this.props.dispatchUpdateSymbolId}
                                                removeSymbolId={this.props.dispatchRemoveSymbolId}
                                                onChange={this.onChange}
                                            />
                                        </Tab.Pane>
                                    )}

                                    {this.props.activeTab === "getFirst" && (
                                        <Tab.Pane eventKey="getFirst">
                                            <GetFirstLast
                                                tableNumber={this.props.tableNumber}
                                                numberOfRecords={this.props.numberOfRecords}
                                                onChange={this.onChange}
                                            />
                                        </Tab.Pane>
                                    )}

                                    {this.props.activeTab === "getNext" && (
                                        <Tab.Pane eventKey="getNext">
                                            <GetNextPrevious
                                                tableNumber={this.props.tableNumber}
                                                symbol={this.props.symbol}
                                                numberOfRecords={this.props.numberOfRecords}
                                                onChange={this.onChange}
                                            />
                                        </Tab.Pane>
                                    )}

                                    {this.props.activeTab === "getLast" && (
                                        <Tab.Pane eventKey="getLast">
                                            <GetFirstLast
                                                tableNumber={this.props.tableNumber}
                                                numberOfRecords={this.props.numberOfRecords}
                                                onChange={this.onChange}
                                            />
                                        </Tab.Pane>
                                    )}

                                    {this.props.activeTab === "getPrevious" && (
                                        <Tab.Pane eventKey="getPrevious">
                                            <GetNextPrevious
                                                tableNumber={this.props.tableNumber}
                                                symbol={this.props.symbol}
                                                numberOfRecords={this.props.numberOfRecords}
                                                onChange={this.onChange}
                                            />
                                        </Tab.Pane>
                                    )}
                                </Tab.Content>

                                <hr />

                                <Form.Group as={Form.Row} className="form-group-margin">
                                    <Form.Label column className={`${labelColumnClass} text-right`}>
                                        Subscription type:
                                    </Form.Label>
                                    <Col sm={inputColumnWidth}>
                                        <SubscriptionTypeControl
                                            size="sm"
                                            variant="outline-primary"
                                            subscriptionType={this.props.subscriptionType}
                                            onChange={this.onChange}
                                        />
                                    </Col>
                                </Form.Group>

                                {this.isEventTypesVisible() && (
                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Event type(s):
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <EventTypesControl.Component
                                                eventTypes={this.props.eventTypes}
                                                required
                                                onChange={this.onChange}
                                            />
                                        </Col>
                                    </Form.Group>
                                )}

                                {/* Conflation. */}
                                {this.props.subscriptionType === Streaming.SubscriptionType.full && (
                                    <ConflationParametersControl
                                        conflationType={this.props.conflationType}
                                        conflationInterval={this.props.conflationInterval}
                                        shouldEnableDynamicConflation={this.props.shouldEnableDynamicConflation}
                                        onChange={this.onChange}
                                    />
                                )}

                                {/* Relationships. */}
                                <Form.Group as={Form.Row} className="form-group-margin">
                                    <div className={labelColumnClass}>
                                        <Form.Row>
                                            <Form.Label column className="text-right">
                                                Relationships:
                                            </Form.Label>
                                        </Form.Row>
                                        {/* TODO not aligned with label on right... */}
                                        <Form.Row className="float-right">
                                            <SimpleTooltip text="Add another relationship">
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    className="float-right"
                                                    onClick={this.props.dispatchAddRelationship}
                                                >
                                                    <span className="fas fa-plus" />
                                                </Button>
                                            </SimpleTooltip>
                                        </Form.Row>
                                    </div>
                                    <Col sm={inputColumnWidth}>
                                        {this.props.relationships.map((relationshipInfo, index) => (
                                            <Relationship
                                                relationshipInfo={relationshipInfo}
                                                subscriptionType={this.props.subscriptionType}
                                                onChange={(updatedRelationshipInfo) =>
                                                    this.props.dispatchUpdateRelationship(
                                                        relationshipInfo.key,
                                                        updatedRelationshipInfo
                                                    )
                                                }
                                                onRemove={
                                                    this.props.relationships.length > 1
                                                        ? () => this.props.dispatchRemoveRelationship(relationshipInfo.key)
                                                        : undefined
                                                }
                                                key={relationshipInfo.key}
                                                // Spacing between relationships.
                                                className={index < this.props.relationships.length - 1 ? "mb-1" : ""}
                                            />
                                        ))}
                                    </Col>
                                </Form.Group>

                                {/* Permission level. */}
                                <Form.Group as={Form.Row} className="form-group-margin">
                                    <Form.Label column className={`${labelColumnClass} text-right`}>
                                        Permission level:
                                    </Form.Label>
                                    <Col sm={inputColumnWidth}>
                                        <PermissionLevelControl
                                            size="sm"
                                            variant="outline-primary"
                                            permissionLevel={this.props.permissionLevel}
                                            onChange={this.onPermissionLevelChange}
                                        />
                                    </Col>
                                </Form.Group>

                                {/* Alias mode. */}
                                <Form.Group as={Form.Row} className="form-group-margin">
                                    <Form.Label column className={`${labelColumnClass} text-right`}>
                                        Handling of alias records:
                                    </Form.Label>
                                    <Col sm={inputColumnWidth}>
                                        <AliasModeControl
                                            size="sm"
                                            variant="outline-primary"
                                            aliasMode={this.props.aliasMode}
                                            onChange={this.onChange}
                                        />
                                    </Col>
                                </Form.Group>

                                <hr />
                                <MakeRequest.Component />
                            </Form>
                        </Card>
                    </Tab.Container>
                </CollapsibleSection>
            </Col>
        );
    }

    private readonly onChange = async (newState: Partial<SnapshotsAndStreamingState>, shouldSubmit?: boolean) => {
        this.props.dispatchUpdateSnapshotsAndStreaming(newState);

        // HACK TODO with setState() we could pass makeRequest as a callback to be invoked after the
        // state has been updated. Not sure how to do that with redux properly.
        // So just defer and "hope" our props are updated.
        // componentHasUpdated() might do the trick, but how to get context in there that the update
        // is the one from the redux dispatch we just sent??
        if (shouldSubmit) {
            await new Promise((resolve) => resolve());

            if (this.props.connectionInfo.connectionState === ConnectionState.connected) {
                this.makeRequest();
            }
        }
    };

    private readonly onPermissionLevelChange = (permissionLevel?: PermissionLevel) => {
        this.onChange({ permissionLevel });
    };

    private isEventTypesVisible() {
        return (
            this.props.subscriptionType === Streaming.SubscriptionType.eventTypeFilterIncludeList ||
            this.props.subscriptionType === Streaming.SubscriptionType.eventTypeFilterExcludeList
        );
    }

    private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        this.makeRequest();
    };

    private makeRequest() {
        const requestName = this.props.activeTab;
        const requestParameters = this.requestParametersBuilder[requestName]();
        let key: string | null = null;

        MakeRequest.initiateAsyncIterable<Streaming.IRecord>(
            `client.streaming.${requestName}`,
            JSON.stringify(requestParameters, null, 2),
            "Streaming.IImage",
            () => {
                // TODO see if we can't get rid of that last cast...
                const requestHandle = (this.props.client!.streaming[requestName] as any)(requestParameters);

                // Add an unsubscription link.
                if (requestHandle.isSubscription) {
                    key = uuid();

                    const subscriptionInfo = {
                        key,
                        requestHandle,
                        name: `${requestName} made on ${formatDate(new Date())}`,
                        tooltip: JSON.stringify(requestParameters),
                        conflationParameters:
                            requestParameters.subscription != null ? requestParameters.subscription.conflation || {} : {}
                    };

                    this.props.dispatchAddSubscriptionInfo(subscriptionInfo);
                }

                return requestHandle;
            },
            () => {
                if (key != null) {
                    this.props.dispatchRemoveSubscriptionInfo(key);
                }
            }
        );
    }

    private makeGetEqualParameters() {
        const requestParameters: Partial<Streaming.IGetEqualParameters> = {
            key: this.props.symbolList
        };

        this.setCommonParameters(requestParameters);

        return requestParameters as Streaming.IGetEqualParameters;
    }

    private makeGetMatchParameters() {
        const requestParameters: Partial<Streaming.IGetMatchParameters> = {
            key: this.props.symbolList,
            matchType: this.props.matchType,
            // The UI logic is the reverse of the API for "clarity".
            shouldMatchExact: !this.props.alwaysGetMatch
        };

        this.setCommonParameters(requestParameters);

        return requestParameters as Streaming.IGetMatchParameters;
    }

    private makeGetPatternParameters() {
        const requestParameters: Partial<Streaming.IGetPatternParameters> = {
            key: this.props.symbolIdList,
            reverseOrder: this.props.reverseOrder
        };

        this.setCommonParameters(requestParameters);

        return requestParameters as Streaming.IGetPatternParameters;
    }

    private makeGetFirstLastParameters() {
        const requestParameters: Partial<Streaming.IGetFirstLastParameters> = {
            key: this.props.tableNumber,
            numberOfRecords: this.props.numberOfRecords
        };

        this.setCommonParameters(requestParameters);

        return requestParameters as Streaming.IGetFirstLastParameters;
    }

    private makeGetNextPreviousParameters() {
        const requestParameters: Partial<Streaming.IGetNextPreviousParameters> = {
            key: {
                tableNumber: this.props.tableNumber!,
                symbol: this.props.symbol
            },
            numberOfRecords: this.props.numberOfRecords
        };

        this.setCommonParameters(requestParameters);

        return requestParameters as Streaming.IGetNextPreviousParameters;
    }

    private setCommonParameters(requestParameters: Partial<Streaming.INavigationalRequestParameters>) {
        requestParameters.relationships = {};

        for (const relationshipInfo of this.props.relationships) {
            const relationship = {
                ...relationshipInfo
            };

            // Cleanup for display in output.
            delete relationship.id;
            delete relationship.key;

            // Undefined is equivalent to RelationshipId.none.
            const key = relationshipInfo.id != null ? relationshipInfo.id : RelationshipId.none;

            requestParameters.relationships = {
                ...requestParameters.relationships,
                [key]: relationship
            };
        }

        if (this.props.subscriptionType != null) {
            requestParameters.subscription = {
                type: this.props.subscriptionType,
                eventTypes: this.props.eventTypes,
                updateHandler: this.updateHandler
            };

            if (this.props.conflationType != null) {
                requestParameters.subscription.conflation = {
                    type: this.props.conflationType,
                    interval: this.props.conflationInterval
                };
            }

            if (this.props.shouldEnableDynamicConflation) {
                if (requestParameters.subscription.conflation == null) {
                    requestParameters.subscription.conflation = {};
                }

                requestParameters.subscription.conflation.dynamicConflationHandler = (
                    dynamicConflationInfo: Streaming.IDynamicConflationInfo
                ) => renderDynamicConflationInfo(this.props.client!, dynamicConflationInfo);
            }
        }

        requestParameters.aliasMode = this.props.aliasMode;
        requestParameters.permissionLevel = this.props.permissionLevel;
    }

    private readonly updateHandler = (update: Streaming.IUpdate) => {
        renderUpdate(this.props.client!, "Streaming.IUpdate", update.responseKey.symbol, update);
    };

    private readonly id = uuid();
    private readonly requestParametersBuilder: RequestParametersBuilder;
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        client: state.root.client,
        connectionInfo: state.root.connectionInfo,
        ...state.snapshotsAndStreaming
    };
}

// Generate redux connected component.
export default connect(mapStateToProps, mapDispatchToProps)(ComponentImpl);
