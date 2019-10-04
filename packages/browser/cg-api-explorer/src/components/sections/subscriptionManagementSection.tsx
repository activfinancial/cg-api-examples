/*
 * Subscription management section.
 */

import * as React from "react";
import { connect } from "react-redux";
import Alert from "react-bootstrap/Alert";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import ListGroup from "react-bootstrap/ListGroup";

import { Component as CollapsibleSection } from "./collapsibleSection";
import * as ConflationParametersControl from "../snapshotsAndStreaming/conflationParametersControl";
import * as MakeRequest from "../makeRequest";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";
import SimpleTooltip from "../simpleTooltip";
import { renderDynamicConflationInfo } from "../../outputFormatters";

import { AppState } from "../../state/store";
import {
    dispatchUpdateSubscriptionInfo,
    dispatchRemoveSubscriptionInfo,
    dispatchUnsubscribeAll
} from "../../state/actions/subscriptionManagementActions";

import { IClient, IDeletable, Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

export interface SubscriptionInfo {
    key: string;
    requestHandle: IDeletable;
    name: string;
    tooltip: string;

    conflationParameters?: Streaming.IConflationParameters;
}

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps {
    client: IClient | null;
    subscriptionInfoList: SubscriptionInfo[];
}

// Redux dispatch functions we use.
const mapDispatchToProps = {
    dispatchUpdateSubscriptionInfo,
    dispatchRemoveSubscriptionInfo,
    dispatchUnsubscribeAll
};

// All props.
type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

// Local state.
interface State extends Streaming.ISessionConflationParameters {}

class ComponentImpl extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            bandwidthThreshold: 0
        };
    }
    render() {
        return (
            <Col>
                <CollapsibleSection title="Subscription Management">
                    <ListGroup>
                        {this.props.subscriptionInfoList.length > 0 && (
                            <ListGroup.Item>
                                <Form style={{ width: "100%", display: "inline-block" }} onSubmit={this.unsubscribeAll}>
                                    <MakeRequest.Component title="Unsubscribe from all requests" />
                                </Form>
                            </ListGroup.Item>
                        )}

                        {/* TODO is it cricket to create a function per entry with a PureComponent?? */}
                        {this.props.subscriptionInfoList.map((subscriptionInfo) => (
                            <ListGroup.Item>
                                <CollapsibleSection title={subscriptionInfo.name} as="h6" initialCollapseState={true}>
                                    <Alert variant="secondary">
                                        <Alert.Heading as="h6">
                                            <b>Request parameters:</b>
                                        </Alert.Heading>
                                        {subscriptionInfo.tooltip}
                                    </Alert>

                                    <Form
                                        style={{ width: "100%", display: "inline-block" }}
                                        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                                            e.preventDefault();
                                            this.onUnsubscribe(subscriptionInfo);
                                        }}
                                    >
                                        <MakeRequest.Component title="Unsubscribe from request" />
                                    </Form>
                                    <hr />

                                    {subscriptionInfo.conflationParameters && (
                                        <Form
                                            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                                                e.preventDefault();
                                                this.onUpdateConflation(subscriptionInfo);
                                            }}
                                        >
                                            <ConflationParametersControl.Component
                                                conflationType={
                                                    (subscriptionInfo.conflationParameters as Streaming.IEnabledConflationParameters)
                                                        .type
                                                }
                                                conflationInterval={
                                                    (subscriptionInfo.conflationParameters as Streaming.IEnabledConflationParameters)
                                                        .interval
                                                }
                                                shouldEnableDynamicConflation={
                                                    subscriptionInfo.conflationParameters.dynamicConflationHandler != null
                                                }
                                                onChange={(newState) =>
                                                    this.onConflationParametersChange(subscriptionInfo, newState)
                                                }
                                            />

                                            <MakeRequest.Component title="Update request conflation" />
                                        </Form>
                                    )}
                                </CollapsibleSection>
                            </ListGroup.Item>
                        ))}

                        <ListGroup.Item>
                            <Form onSubmit={this.onUpdateSessionConflation}>
                                <Form.Group as={Form.Row} className="form-group-margin">
                                    <Form.Label column className={`${labelColumnClass} text-right`}>
                                        Bandwidth threshold:
                                    </Form.Label>
                                    <Col sm={inputColumnWidth}>
                                        <SimpleTooltip text="For dynamic conflation, in bytes/sec">
                                            <Form.Control
                                                type="number"
                                                size="sm"
                                                min="0"
                                                max="4294967295"
                                                value={`${this.state.bandwidthThreshold}`}
                                                required
                                                onChange={this.onBandwidthThresholdChange}
                                            />
                                        </SimpleTooltip>
                                    </Col>
                                </Form.Group>

                                <MakeRequest.Component title="Update session conflation" />
                            </Form>
                        </ListGroup.Item>
                    </ListGroup>
                </CollapsibleSection>
            </Col>
        );
    }

    private readonly unsubscribeAll = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        this.props.dispatchUnsubscribeAll();
    };

    private readonly onUnsubscribe = (subscriptionInfo: SubscriptionInfo) => {
        this.props.dispatchRemoveSubscriptionInfo(subscriptionInfo.key);
    };

    private readonly onConflationParametersChange = (
        subscriptionInfo: SubscriptionInfo,
        newState: Partial<ConflationParametersControl.LiftedState>
    ) => {
        const conflationParameters: Streaming.IConflationParameters = {
            ...subscriptionInfo.conflationParameters
        };

        // TODO bit messy. Maybe use Streaming.ConflationParameters in the control.
        if ("conflationType" in newState) {
            if (newState.conflationType == null) {
                delete (conflationParameters as Streaming.IEnabledConflationParameters).type;
            } else {
                (conflationParameters as Streaming.IEnabledConflationParameters).type = newState.conflationType;
            }
        }

        if ("conflationInterval" in newState) {
            if (newState.conflationInterval == null) {
                delete (conflationParameters as Streaming.IEnabledConflationParameters).interval;
            } else {
                (conflationParameters as Streaming.IEnabledConflationParameters).interval = newState.conflationInterval;
            }
        }

        if ("shouldEnableDynamicConflation" in newState) {
            if (newState.shouldEnableDynamicConflation) {
                conflationParameters.dynamicConflationHandler = (dynamicConflationInfo: Streaming.IDynamicConflationInfo) =>
                    renderDynamicConflationInfo(this.props.client!, dynamicConflationInfo);
            } else {
                delete conflationParameters.dynamicConflationHandler;
            }
        }

        this.props.dispatchUpdateSubscriptionInfo(subscriptionInfo.key, { conflationParameters });
    };

    private async onUpdateConflation(subscriptionInfo: SubscriptionInfo) {
        if (subscriptionInfo.conflationParameters) {
            const requestHandle = subscriptionInfo.requestHandle as Streaming.IRequestHandle;

            MakeRequest.initiate(
                "requestHandle.setConflationParameters",
                Streaming.isConflationEnabled(subscriptionInfo.conflationParameters)
                    ? JSON.stringify(subscriptionInfo.conflationParameters)
                    : "",
                "Result",
                () =>
                    requestHandle.setConflationParameters(subscriptionInfo.conflationParameters as Streaming.IConflationParameters)
            );
        }
    }

    private readonly onUpdateSessionConflation = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        MakeRequest.initiate("client.streaming.setConflationParameters", JSON.stringify(this.state), "Result", () =>
            this.props.client!.streaming.setConflationParameters(this.state)
        );
    };

    private readonly onBandwidthThresholdChange = (e: any /* TODO real type */) => {
        const bandwidthThreshold = e.target.valueAsNumber;

        this.setState({ bandwidthThreshold });
    };
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        client: state.root.client,
        subscriptionInfoList: state.subscriptionManagement.subscriptionInfoList
    };
}

// Generate redux connected component.
export const Component = connect(
    mapStateToProps,
    mapDispatchToProps
)(ComponentImpl);
