/*
 * Connection management section.
 */

import * as React from "react";
import { connect as reduxConnect } from "react-redux";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import ToggleButton from "react-bootstrap/ToggleButton";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";

import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";
import { ConnectionInfo, ConnectionState } from "../../connectionInfo";
import * as CollapsibleSection from "./collapsibleSection";
import SimpleTooltip from "../simpleTooltip";
import { createHeaderTimestamp, renderObject } from "../../outputFormatters";

import { AppState } from "../../state/store";
import {
    dispatchSetUrl,
    dispatchSetClient,
    dispatchSetConnectionInfo,
    dispatchAddServerMessage
} from "../../state/actions/rootActions";
import { dispatchResetPendingRequestCounter, dispatchAppendOutput, OutputType } from "../../state/actions/outputContainerActions";
import { dispatchUnsubscribeAll } from "../../state/actions/subscriptionManagementActions";

import contentGatewayList from "../../../../common/contentGateways";

import { connect, ConnectParameters, Client, windowLoaded, asyncSleep, Streaming } from "@activfinancial/cg-api";

// Could be a polyfill for Edge.
import "url-search-params-polyfill";

// ---------------------------------------------------------------------------------------------------------------------------------

export function makeContentGatewayUrl(host: string | null): string {
    if (host) {
        // URL class will not error on "host:port", so use a regex to see if host is a URL.
        const urlRegex = /\S+:\/\/\S+/;
        if (urlRegex.test(host)) {
            return host;
        }

        // Not a URL. Let the cg-api default the port number if there isn't one.
        return `ams://${host}/ContentGateway:Service`;
    }

    for (const location in contentGatewayList) {
        return (contentGatewayList as any)[location];
    }

    return "ams://cg-ny4-web.activfinancial.com/ContentGateway:Service";
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Generate <option> child elements for the urlList <datalist> element from the static list of CGs. */
function renderUrlList() {
    return Object.keys(contentGatewayList).map((key) => <option key={key} value={contentGatewayList[key]} />);
}

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up elsewhere (redux in our case).
export interface LiftedState {
    url: string;
}

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps extends LiftedState {
    client: Client | null;
    connectionInfo: ConnectionInfo;
}

// Redux dispatch functions we use.
const mapDispatchToProps = {
    dispatchSetUrl,
    dispatchSetClient,
    dispatchSetConnectionInfo,
    dispatchAddServerMessage,
    dispatchResetPendingRequestCounter,
    dispatchAppendOutput,
    dispatchUnsubscribeAll
};

// All props.
type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

// Remove url from ConnectParameters as we'll store it in redux instead.
interface State extends Pick<ConnectParameters, Exclude<keyof ConnectParameters, "url">> {
    displayMinuteHeartbeats: boolean;
}

class ComponentImpl extends React.Component<Props, State> {
    /** Constructor. */
    constructor(props: Props) {
        super(props);

        // Parse URL for userId, host, auto connect options for initial state.
        const { shouldConnectOnStartup, ...state } = this.processUrl();
        this.shouldConnectOnStartup = shouldConnectOnStartup;
        this.state = {
            ...state,
            displayMinuteHeartbeats: false
        };

        if (shouldConnectOnStartup) {
            (async () => {
                // Give form fillers a chance to populate fields.
                await windowLoaded();
                await asyncSleep(1500);

                if (this.props.url !== "" && this.state.password !== "") {
                    this.connect();
                }
            })();
        }
    }

    /** Render. */
    render() {
        return (
            <Col>
                <CollapsibleSection.Component title="Connection Management" ref={this.collapsibleSectionRef}>
                    <Card bg="light" body>
                        <Form onSubmit={this.processSubmit}>
                            <Form.Group as={Form.Row} className="form-group-margin">
                                {/* sm={5} not working on Form.Label! Docs lie?! */}
                                <Form.Label column className={`${labelColumnClass} text-right`}>
                                    URL (or host, or host:port):
                                </Form.Label>
                                <Col sm={inputColumnWidth}>
                                    <InputGroup>
                                        <Form.Control
                                            type="text"
                                            size="sm"
                                            required
                                            name="url"
                                            value={this.props.url}
                                            list="urlList"
                                            onChange={this.onUrlChange}
                                        />
                                        <InputGroup.Append>
                                            <Button size="sm" variant="outline-secondary" onClick={this.onUrlClear}>
                                                <span className="fas fa-trash-alt" />
                                            </Button>
                                        </InputGroup.Append>
                                    </InputGroup>
                                </Col>
                                <datalist id="urlList">{renderUrlList()}</datalist>
                            </Form.Group>

                            <Form.Group as={Form.Row} className="form-group-margin">
                                <Form.Label column className={`${labelColumnClass} text-right`}>
                                    User id:
                                </Form.Label>
                                <Col sm={inputColumnWidth}>
                                    <Form.Control
                                        type="text"
                                        size="sm"
                                        required
                                        name="userId"
                                        value={this.state.userId}
                                        onChange={this.onUserIdChange}
                                    />
                                </Col>
                            </Form.Group>

                            <Form.Group as={Form.Row} className="form-group-margin">
                                <Form.Label column className={`${labelColumnClass} text-right`}>
                                    Password:
                                </Form.Label>
                                <Col sm={inputColumnWidth}>
                                    <Form.Control
                                        type="password"
                                        size="sm"
                                        required
                                        name="password"
                                        value={this.state.password}
                                        onChange={this.onPasswordChange}
                                    />
                                </Col>
                            </Form.Group>

                            <Form.Group as={Form.Row} className="form-group-margin">
                                <Form.Label column className={`${labelColumnClass} text-right`}>
                                    Information to pass to the server:
                                </Form.Label>
                                <Col sm={inputColumnWidth}>
                                    <Form.Control
                                        type="text"
                                        size="sm"
                                        value={this.state.userContext}
                                        placeholder="Anything entered here is simply logged by the server"
                                        onChange={this.onUserContextChange}
                                    />
                                </Col>
                            </Form.Group>

                            <Form.Group as={Form.Row} className="form-group-margin">
                                <Form.Label column className={`${labelColumnClass} text-right`}>
                                    Options:
                                </Form.Label>

                                <Col sm={inputColumnWidth}>
                                    <ButtonGroup vertical toggle className="btn-block">
                                        <SimpleTooltip
                                            text="If this user id is concurrently in use as many times as permitted,
                                            disconnect an instance of the user to allow this logon to succeed."
                                        >
                                            <ToggleButton
                                                type="checkbox"
                                                value="disconnectExisting"
                                                variant="outline-primary"
                                                size="sm"
                                                checked={this.state.disconnectExisting}
                                                onChange={this.onDisconnectExistingChange}
                                            >
                                                Disconnect existing logon with this id?
                                            </ToggleButton>
                                        </SimpleTooltip>

                                        <SimpleTooltip
                                            text="If a feed goes in to a failure state, disconnect this logon rather
                                            than receiving a status change notification."
                                        >
                                            <ToggleButton
                                                type="checkbox"
                                                value="disconnectOnFeedFailure"
                                                variant="outline-primary"
                                                size="sm"
                                                checked={this.state.disconnectOnFeedFailure}
                                                onChange={this.onDisconnectOnFeedFailureChange}
                                            >
                                                Disconnect on feed failure?
                                            </ToggleButton>
                                        </SimpleTooltip>

                                        <SimpleTooltip
                                            text="The ContentGateway will send a heartbeat at the start of every minute.
                                            Set this option to display those heartbeats when received."
                                        >
                                            <ToggleButton
                                                type="checkbox"
                                                value="showMinuteHeartbeats"
                                                variant="outline-primary"
                                                size="sm"
                                                checked={this.state.displayMinuteHeartbeats}
                                                onChange={this.onDisplayMinuteHeartbeatsChange}
                                            >
                                                Display minute heartbeats?
                                            </ToggleButton>
                                        </SimpleTooltip>
                                    </ButtonGroup>
                                </Col>
                            </Form.Group>

                            <hr />

                            <ButtonToolbar className="float-right">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={ConnectionState.disconnected !== this.props.connectionInfo.connectionState}
                                    type="submit"
                                >
                                    Connect&nbsp;
                                    <span
                                        className={`fas ${
                                            ConnectionState.connecting === this.props.connectionInfo.connectionState
                                                ? "fa-spinner fa-spin"
                                                : "fa-sign-in-alt"
                                        }`}
                                        aria-hidden="true"
                                    />
                                </Button>
                                {/* HACK ButtonToolbar doesn't space buttons for some reason. */}
                                &nbsp;
                                <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={ConnectionState.connected !== this.props.connectionInfo.connectionState}
                                    onClick={this.processDisconnectClick}
                                >
                                    Disconnect&nbsp;
                                    <span className="fas fa-sign-out-alt" aria-hidden="true" />
                                </Button>
                            </ButtonToolbar>
                        </Form>
                    </Card>
                </CollapsibleSection.Component>
            </Col>
        );
    }

    private readonly onUrlChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const url = e.target.value;
        this.props.dispatchSetUrl(url);
    };

    private readonly onUrlClear = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        this.props.dispatchSetUrl("");
    };

    private readonly onUserIdChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const userId = e.target.value;
        this.setState({ userId });
    };

    private readonly onPasswordChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const password = e.target.value;
        this.setState({ password });
    };

    private readonly onUserContextChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const userContext = e.target.value;
        this.setState({ userContext });
    };

    private readonly onDisconnectExistingChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const disconnectExisting = e.target.checked;
        this.setState({ disconnectExisting });
    };

    private readonly onDisconnectOnFeedFailureChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const disconnectOnFeedFailure = e.target.checked;
        this.setState({ disconnectOnFeedFailure });
    };

    private readonly onDisplayMinuteHeartbeatsChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const showMinuteHeartbeats = e.target.checked;
        this.setState({ displayMinuteHeartbeats: showMinuteHeartbeats });
    };

    private readonly processSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        this.connect();
    };

    private async connect() {
        const initialTitle = document.title;
        const connectParameters: ConnectParameters = {
            ...this.state,
            url: makeContentGatewayUrl(this.props.url),
            onHeartbeatMessage: this.state.displayMinuteHeartbeats ? this.onHeartbeatMessage : undefined,
            onServerMessage: this.onServerMessage,

            streaming: {
                onAliasUpdate: this.onAliasUpdate
            }
        };

        try {
            this.props.dispatchSetConnectionInfo({
                // TODO nested state is a pain. What's the right thing to do?
                ...this.props.connectionInfo,
                connectionState: ConnectionState.connecting
            });

            const client = await connect(connectParameters);

            this.props.dispatchSetConnectionInfo({
                ...this.props.connectionInfo,
                connectionState: ConnectionState.connected
            });

            this.props.dispatchSetClient(client);

            // Async iteration of ContentGateway status updates.
            (async () => {
                try {
                    let isInitialResponse = true;
                    for await (const contentGatewayInfo of client.metaData.getContentGatewayInfo()) {
                        if (this.props.connectionInfo.connectionState === ConnectionState.connected) {
                            document.title = `(${contentGatewayInfo.systemInfo.hostname}) ${initialTitle}`;

                            const connectionInfo: Partial<ConnectionInfo> = {
                                hostname: contentGatewayInfo.systemInfo.hostname,
                                isDynamicConflationAvailable: contentGatewayInfo.isDynamicConflationAvailable
                            };

                            if (isInitialResponse || contentGatewayInfo.hasHistoryServiceChanged) {
                                connectionInfo.isHistoryServiceAvailable = contentGatewayInfo.isHistoryServiceAvailable;
                            }

                            if (isInitialResponse || contentGatewayInfo.hasNewsServerServiceChanged) {
                                connectionInfo.isNewsServerServiceAvailable = contentGatewayInfo.isNewsServerServiceAvailable;
                            }

                            if (isInitialResponse || contentGatewayInfo.hasSymbolDirectoryServiceChanged) {
                                connectionInfo.isSymbolDirectoryServiceAvailable =
                                    contentGatewayInfo.isSymbolDirectoryServiceAvailable;
                            }

                            this.props.dispatchSetConnectionInfo({
                                ...this.props.connectionInfo,
                                ...connectionInfo,
                                statusText: `Connected to ${connectionInfo.hostname}`
                            });

                            isInitialResponse = false;
                        }
                    }
                } catch {}
            })();

            // Collapse our section if it was a startup connect.
            if (this.shouldConnectOnStartup) {
                this.shouldConnectOnStartup = false;

                if (this.collapsibleSectionRef.current) {
                    this.collapsibleSectionRef.current.setState({ collapseState: true });
                }
            }

            // // Just await for a break or we disconnect().
            await client.disconnected;
            this.processDisconnect();
        } catch (error) {
            const text = `Connection ${
                this.props.connectionInfo.connectionState === ConnectionState.connected ? "broken" : "failed"
            } - ${error.toString()}`;
            console.log(text);
            this.processDisconnect(text);
        }
    }

    /** Handle disconnect button click. */
    private processDisconnectClick = () => {
        if (this.props.client != null) {
            this.props.client.disconnect();
        }
    };

    /** Handle a disconnection. */
    private processDisconnect(statusText?: string) {
        this.props.dispatchUnsubscribeAll();
        document.title = this.initialTitle;

        this.props.dispatchSetConnectionInfo({
            connectionState: ConnectionState.disconnected,
            hostname: "",
            statusText,
            // Don't hide anything when disconnect; might as well as allow browsing what might be available.
            isHistoryServiceAvailable: true,
            isNewsServerServiceAvailable: true,
            isSymbolDirectoryServiceAvailable: true,
            isDynamicConflationAvailable: false
        });

        this.props.dispatchSetClient(null);
        this.props.dispatchResetPendingRequestCounter();
    }

    // Parse URL.
    private processUrl() {
        if (document.location == null) {
            return {
                shouldConnectOnStartup: false,
                userId: "",
                password: ""
            };
        }

        const url = new URL(document.location.toString());
        const urlSearchParams = new URLSearchParams(url.search);
        const host = urlSearchParams.get("host");
        if (host != null) {
            this.props.dispatchSetUrl(host);
        }

        return {
            shouldConnectOnStartup: urlSearchParams.get("connect") != null,
            userId: urlSearchParams.get("userId") || "",
            password: ""
        };
    }

    private readonly onHeartbeatMessage = (date: Date) => {
        console.log(`Heartbeat from CG ${date.toString()}`);

        this.props.dispatchAppendOutput(
            OutputType.always,
            <div>
                {createHeaderTimestamp()}Heartbeat from ContentGateway: {date.toString()}
            </div>
        );
    };

    private readonly onServerMessage = (message: string) => {
        console.log(`Received message from CG: ${message}`);

        this.props.dispatchAddServerMessage(message);
    };

    private readonly onAliasUpdate = (aliasUpdateInfo: Streaming.AliasUpdateInfo) => {
        this.props.dispatchAppendOutput(
            OutputType.always,
            <>
                {createHeaderTimestamp()}Alias update:
                <div>{renderObject(this.props.client!, "AliasUpdateInfo", aliasUpdateInfo)}</div>
            </>
        );
    };

    private readonly initialTitle = document.title;

    // We need a ref to the CollapsibleSection so we can programmatically close it on auto-connect.
    // Moving the collapse state up out of CollapsibleSection will make usage messy for the general
    // case of not needing to programmatically change the state. Hence we'll use a ref.
    // TODO maybe there's a better method?
    private readonly collapsibleSectionRef = React.createRef<CollapsibleSection.ComponentImpl>();
    private shouldConnectOnStartup: boolean;
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        url: state.root.url,
        client: state.root.client,
        connectionInfo: state.root.connectionInfo
    };
}

// Generate redux connected component.
export const Component = reduxConnect(mapStateToProps, mapDispatchToProps)(ComponentImpl);
