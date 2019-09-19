/*
 * ActivWorkstation main window.
 */

import * as React from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Table from "react-bootstrap/Table";
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import uuid from "uuid/v4";

import ConnectDialog from "./connectDialog";
import CgState from "./cgState";
import { WindowType, WindowInfo, WindowManager } from "./windowManager";

import contentGatewayList from "../../../common/contentGateways";

import {
    Client,
    connect as cgConnect,
    asyncSleep,
    FieldId,
    MetaData,
    RelationshipId,
    StatusCode,
    Streaming,
    PermissionId
} from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Get CSS class for a CgState, for the status icon. */
function cgStateToClass(cgState: CgState) {
    switch (cgState) {
        case CgState.connecting:
            return "connecting";

        case CgState.connected:
            return "active";

        case CgState.error:
            return "error";

        default:
            return "";
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Set of windows keyed by WindowType. */
type Windows = {
    [windowType in WindowType]?: WindowInfo;
};

/** Symbol data (per-row in the table). */
class SymbolInfo {
    constructor(public symbol: string) {}

    readonly uuid: string = uuid();

    /** Request for name and other info. */
    requestHandle: Streaming.RequestHandle | null = null;

    permissionId: PermissionId = PermissionId.unknown;
    name: string = "";

    /** Value in form when editing. */
    input: string = "";

    /** Ref to symbol input so we can focus it. */
    readonly ref: React.RefObject<HTMLInputElement> = React.createRef<HTMLInputElement>();

    /** Child windows. Only allow one instance of each WindowType per row. */
    windows: Windows = {};

    /** Update symbol for all open windows. */
    readonly updateSymbolWindows = (symbol: string) => {
        for (const windowType in this.windows) {
            const windowInfo = this.windows[(windowType as unknown) as WindowType];
            if (windowInfo != null) {
                windowInfo.updateSymbol(symbol);
            }
        }
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Props. */
interface Props {
    mainWindow: fin.OpenFinWindow;
    mainWindowOptions: fin.WindowOption;
}

/** State. */
interface State {
    /** Whether the connect dialog should be rendered. */
    showConnectDialog: boolean;

    /** State of connection to CG. */
    cgState: CgState;
    statusText: string;

    url: string;
    userId: string;
    password: string;

    /** Symbols and their windows. */
    symbolInfos: SymbolInfo[];

    /** Last row in the symbol table for entering a new symbol. */
    newSymbol: string;
}

/** Main app component. */
class App extends React.Component<Props, State> {
    // Default child window options.
    private readonly childWindowOptions: fin.WindowOption;

    // Reference to the new symbol input so we can programmatically focus it.
    private readonly symbolInputRef = React.createRef<HTMLInputElement>();

    // cg-api client.
    private clientPromise: Promise<Client> | null = null;
    private client: Client | null = null;

    /** Constructor. */
    constructor(props: Props) {
        super(props);

        const url = localStorage.getItem("url");
        const userId = localStorage.getItem("userId");
        const password = localStorage.getItem("password");

        const connectionState = {
            url: url || Object.values(contentGatewayList)[0],
            userId: userId || "",
            password: password || ""
        };

        // Populate initial list of symbols.
        let symbolInfos: SymbolInfo[] = [];
        const symbols = localStorage.getItem("symbols");
        if (symbols != null) {
            const symbolList = JSON.parse(symbols);
            if (symbolList != null) {
                for (const symbol of symbolList) {
                    symbolInfos.push(new SymbolInfo(symbol));
                }
            }
        }

        this.state = {
            showConnectDialog:
                connectionState.userId.length === 0 || connectionState.password.length === 0 || connectionState.url.length === 0,
            ...connectionState,

            cgState: CgState.disconnected,
            statusText: "",

            symbolInfos,
            newSymbol: ""
        };

        this.childWindowOptions = { contextMenu: props.mainWindowOptions.contextMenu };

        // Select symbol input on focus.
        props.mainWindow.addEventListener("focused", this.focusSymbolInput);
    }

    // Child window manager.
    private readonly windowManager = new WindowManager(this.childWindowOptions);

    render() {
        return (
            <>
                <Table id="symbolsTable" borderless size="sm">
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Name</th>
                            <th>Permission id</th>
                        </tr>
                    </thead>

                    <tbody>
                        {this.state.symbolInfos.map((symbolInfo) => this.renderRow(symbolInfo))}

                        {/* Empty input row for entering new symbols. */}
                        <tr>
                            <td>
                                <Form
                                    onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                                        e.preventDefault();
                                        this.addRow();
                                    }}
                                >
                                    <Form.Control
                                        className="symbol-link link-button"
                                        type="text"
                                        // TODO buggy TS defs AFAICT.
                                        ref={this.symbolInputRef as React.RefObject<any>}
                                        value={this.state.newSymbol}
                                        placeholder="Enter symbol"
                                        onChange={(e: any /* TODO real type */) => {
                                            this.setState({
                                                newSymbol: e.target.value
                                            });
                                        }}
                                    ></Form.Control>
                                </Form>
                            </td>
                            <td></td>
                            <td></td>
                        </tr>
                    </tbody>
                </Table>

                <ConnectDialog
                    show={this.state.showConnectDialog}
                    cgState={this.state.cgState}
                    url={this.state.url}
                    userId={this.state.userId}
                    password={this.state.password}
                    onHide={() => this.setState({ showConnectDialog: false })}
                    onConnect={() => this.connect()}
                    onDisconnect={() => this.disconnect()}
                    onUrlChange={(url: string) => this.setState({ url })}
                    onUserIdChange={(userId: string) => this.setState({ userId })}
                    onPasswordChange={(password: string) => this.setState({ password })}
                ></ConnectDialog>

                <footer className="footer container-fluid">
                    <Row noGutters>
                        <Col xs={4} style={{ paddingLeft: "0.2rem" }}>
                            <Button
                                className="icon-button"
                                title="Show connection settings"
                                onClick={() => this.setState({ showConnectDialog: true })}
                            >
                                <span className="fas fa-cog">&nbsp;</span>
                            </Button>
                            Connection status:&nbsp;
                            <div className={`status-indicator ${cgStateToClass(this.state.cgState)}`}></div>
                        </Col>

                        <Col xs={8} style={{ paddingRight: "0.2rem", textAlign: "right" }}>
                            {this.state.statusText}
                        </Col>
                    </Row>
                </footer>

                <ContextMenu id="symbolContextMenu">
                    <MenuItem disabled>Open with:</MenuItem>
                    <MenuItem
                        onClick={(event: React.TouchEvent<HTMLTableRowElement>, symbolInfo: SymbolInfo) =>
                            this.showWindow(symbolInfo, WindowType.optionChain)
                        }
                    >
                        Options analysis
                    </MenuItem>
                    <MenuItem
                        onClick={(event: React.TouchEvent<HTMLTableRowElement>, symbolInfo: SymbolInfo) =>
                            this.showWindow(symbolInfo, WindowType.recordViewer)
                        }
                    >
                        Record viewer
                    </MenuItem>
                    <MenuItem
                        onClick={(event: React.TouchEvent<HTMLTableRowElement>, symbolInfo: SymbolInfo) =>
                            this.showWindow(symbolInfo, WindowType.newsViewer)
                        }
                    >
                        News viewer
                    </MenuItem>
                    <MenuItem
                        onClick={(event: React.TouchEvent<HTMLTableRowElement>, symbolInfo: SymbolInfo) =>
                            this.showWindow(symbolInfo, WindowType.timeSeriesChart)
                        }
                    >
                        Closing price chart
                    </MenuItem>
                </ContextMenu>
            </>
        );
    }

    componentDidMount() {
        if (!this.state.showConnectDialog) {
            // Fire off a connect on startup if we've got credentials.
            this.connect();
        }

        // Select new symbol input after initial render.
        this.focusSymbolInput();
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        const prevSymbolList = JSON.stringify(prevState.symbolInfos.map((symbolInfo) => symbolInfo.symbol));
        const symbolList = JSON.stringify(this.state.symbolInfos.map((symbolInfo) => symbolInfo.symbol));

        if (prevSymbolList !== symbolList) {
            // Save new symbol list.
            localStorage.setItem("symbols", symbolList);
        }
    }

    /** Focus the new symbol input. */
    private focusSymbolInput = () => {
        if (this.symbolInputRef.current != null) {
            this.symbolInputRef.current.focus();
        }
    };

    /** Connection loop. */
    private async connect() {
        let isConnected = false;

        while (true) {
            let clientPromise: Promise<Client>;
            let cgInfoRequest: MetaData.ContentGatewayInfoRequestHandle | null = null;

            try {
                this.setState({ cgState: CgState.connecting, statusText: "Connecting..." });

                // We keep a local copy of the promise to compare with the class property, to see
                // if a pending connect was stopped in flight.
                clientPromise = cgConnect({
                    url: this.state.url,
                    userId: this.state.userId,
                    password: this.state.password
                });
                this.clientPromise = clientPromise;

                // Wait for connection to establish.
                this.client = await clientPromise;

                // Check if disconnect was hit whilst connecting.
                if (this.clientPromise !== clientPromise) {
                    return;
                }

                // Connection up.
                isConnected = true;
                this.setState({ cgState: CgState.connected, statusText: "", showConnectDialog: false });

                // Store credentials on successful connect.
                localStorage.setItem("url", this.state.url);
                localStorage.setItem("userId", this.state.userId);
                localStorage.setItem("password", this.state.password);

                // Get CG info.
                cgInfoRequest = this.client.metaData.getContentGatewayInfo();

                (async () => {
                    // This returns an iterable, but we only want the initial data.
                    for await (const contentGatewayInfo of cgInfoRequest) {
                        this.setState({ statusText: contentGatewayInfo.systemInfo.hostname });
                        break;
                    }

                    cgInfoRequest.delete();
                    cgInfoRequest = null;
                })();

                // Reconnect all windows to the CG using this session.
                this.windowManager.reconnectAllWindows(this.clientPromise);

                // (Re-) Get data for symbol table.
                for (const symbolInfo of this.state.symbolInfos) {
                    const newSymbolInfo = { ...symbolInfo };

                    this.getRowData(newSymbolInfo);
                    this.updateRow(newSymbolInfo);
                }

                // Wait for disconnect to be hit, or connection to break.
                await this.client.disconnected;

                this.setState({ cgState: CgState.disconnected, statusText: "Disconnected" });
                return;
            } catch (e) {
                if (cgInfoRequest != null) {
                    cgInfoRequest.delete();
                }

                // Check if disconnect was hit whilst connecting.
                if (this.clientPromise !== clientPromise!) {
                    return;
                }

                const statusText = `Connection ${isConnected ? "broken" : "failed"} (${e.message})`;
                console.log(`${statusText}; ${e}`);
                this.setState({ cgState: CgState.error, statusText });
            }

            await asyncSleep(5000);

            // Check if disconnect was hit whilst sleeping.
            if (this.clientPromise !== clientPromise!) {
                return;
            }
        }
    }

    /** Disconnect. */
    private disconnect() {
        if (this.client != null) {
            // Connection is up, so disconnect it.
            this.client.disconnect();
            this.client = null;
        } else {
            // We can't cancel a pending connect. It will complete normally (successfully or failure)
            // and then we'll have to check the promise to see if it's been changed.
            // Also requesting a re-render now rather than waiting for the connect to finish.
            this.setState({ cgState: CgState.disconnected, statusText: "Disconnected" });
            this.clientPromise = null;
        }
    }

    /**
     * Handle submit on an existing row.
     *
     * @param symbolInfo
     */
    private processRowSubmit(symbolInfo: SymbolInfo) {
        if (symbolInfo.input === "") {
            // Empty input is handled in onChange, so shouldn't end up here.
            return;
        }

        const newSymbolInfo = {
            ...symbolInfo,
            input: "",
            symbol: symbolInfo.input,
            name: "",
            permissionId: PermissionId.unknown
        };

        this.getRowData(newSymbolInfo);
        this.updateRow(newSymbolInfo);

        // Clear down any open windows whilst we wait for new symbol data to arrive.
        // The windows will then be updated again.
        symbolInfo.updateSymbolWindows("");
    }

    /** Add a new row from the new symbol input. */
    private addRow() {
        if (this.state.newSymbol.length === 0) {
            return;
        }

        const newSymbolInfo = new SymbolInfo(this.state.newSymbol);
        this.getRowData(newSymbolInfo);

        this.setState(() => {
            return {
                symbolInfos: [...this.state.symbolInfos, newSymbolInfo],
                newSymbol: ""
            };
        });
    }

    /** Update a symbol row. */
    private updateRow(symbolInfo: SymbolInfo) {
        this.setState(() => {
            const index = this.findRow(symbolInfo.uuid);
            if (index === -1) {
                return null;
            }

            const symbolInfos = this.state.symbolInfos
                .slice(0, index)
                .concat(symbolInfo)
                .concat(this.state.symbolInfos.slice(index + 1));

            return { symbolInfos };
        });
    }

    /** Remove a symbol row. */
    private removeRow(symbolInfo: SymbolInfo) {
        this.setState(() => {
            const index = this.findRow(symbolInfo.uuid);
            if (index === -1) {
                return null;
            }

            const symbolInfos = this.state.symbolInfos.slice(0, index).concat(this.state.symbolInfos.slice(index + 1));

            return { symbolInfos };
        });
    }

    /** Find row's index by uuid. */
    private findRow(uuid: string) {
        return this.state.symbolInfos.findIndex((symbolInfo) => uuid === symbolInfo.uuid);
    }

    /** Render a row in the symbol table. */
    private renderRow(symbolInfo: SymbolInfo) {
        // Only attach the context menu if the symbol is found.
        if (symbolInfo.permissionId !== PermissionId.unknown) {
            return (
                <ContextMenuTrigger
                    id="symbolContextMenu"
                    key={symbolInfo.uuid}
                    renderTag="tr"
                    attributes={{
                        onClick: () => {
                            // Focus symbol input if anywhere on row is clicked.
                            if (symbolInfo.ref.current) {
                                symbolInfo.ref.current.select();
                                symbolInfo.ref.current.focus();
                            }
                        }
                    }}
                    collect={() => symbolInfo}
                >
                    {this.renderColumns(symbolInfo)}
                </ContextMenuTrigger>
            );
        } else {
            return <tr key={symbolInfo.uuid}>{this.renderColumns(symbolInfo)}</tr>;
        }
    }

    /** Render the columns for a row in the symbol table. */
    private renderColumns(symbolInfo: SymbolInfo) {
        // If the "input" field isn't empty, we must be editing the row so show that rather than
        // the symbol itself.
        const displaySymbol = symbolInfo.input.length === 0 ? symbolInfo.symbol : symbolInfo.input;

        const updateEdit = (input: string) => {
            const newSymbolInfo = { ...symbolInfo, input };
            this.updateRow(newSymbolInfo);
        };

        return (
            <>
                <td>
                    <Form
                        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                            e.preventDefault();
                            this.processRowSubmit(symbolInfo);
                        }}
                    >
                        <Form.Control
                            // TODO buggy TS defs AFAICT.
                            ref={symbolInfo.ref as React.RefObject<any>}
                            className="symbol-link link-button"
                            type="text"
                            value={displaySymbol}
                            onChange={(e: any /* TODO real type */) => {
                                const input = e.target.value;

                                if (input.length === 0) {
                                    this.removeRow(symbolInfo);
                                } else {
                                    updateEdit(input);
                                }
                            }}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === "Escape") {
                                    updateEdit("");
                                }
                            }}
                            onBlur={() => updateEdit("")}
                        ></Form.Control>
                    </Form>
                </td>
                <td>{symbolInfo.name}</td>
                <td>
                    {PermissionId.unknown !== symbolInfo.permissionId &&
                        (PermissionId[symbolInfo.permissionId] || symbolInfo.permissionId)}
                </td>
            </>
        );
    }

    /** Get data to display in the symbol table for a single row. */
    private async getRowData(symbolInfo: SymbolInfo) {
        if (this.client != null) {
            // Cancel any previous request. Note symbolInfo is a copy of state, so this is OK.
            // It's not committed yet.
            if (symbolInfo.requestHandle != null) {
                symbolInfo.requestHandle.delete();
                symbolInfo.requestHandle = null;
            }

            // Canonical request in order to get exact symbol, and company to get name field if not
            // in the canonical record.
            const requestHandle = this.client.streaming.getMatch({
                key: symbolInfo.symbol,
                matchType: Streaming.GetMatchType.composite,
                relationships: {
                    [RelationshipId.none]: {
                        fieldIds: [FieldId.FID_NAME]
                    },
                    [RelationshipId.company]: {
                        fieldIds: [FieldId.FID_NAME]
                    }
                }
            });

            symbolInfo.requestHandle = requestHandle;

            for await (const record of requestHandle) {
                // Re-resolve the SymbolInfo.
                const existingSymbolInfoIndex = this.findRow(symbolInfo.uuid);
                if (existingSymbolInfoIndex === -1) {
                    return;
                }

                const existingSymbolInfo = this.state.symbolInfos[existingSymbolInfoIndex];

                if (existingSymbolInfo.requestHandle !== requestHandle) {
                    // Request was cancelled and this isn't a response we're interested in any longer.
                    return;
                }

                const newSymbolInfo = { ...existingSymbolInfo };

                switch (record.relationshipId) {
                    case RelationshipId.none:
                        if (record.statusCode === StatusCode.success) {
                            newSymbolInfo.symbol = record.responseKey.symbol;
                            newSymbolInfo.permissionId = record.permissionId;

                            const name = record.getField(FieldId.FID_NAME).value;
                            if (name != null) {
                                newSymbolInfo.name = name as string;
                            }

                            // Fully resolved symbol, so update any windows opened for this row.
                            symbolInfo.updateSymbolWindows(newSymbolInfo.symbol);
                        } else {
                            // Error case. Just display status code.
                            newSymbolInfo.name = StatusCode[record.statusCode];
                        }
                        break;

                    case RelationshipId.company:
                        if (record.statusCode === StatusCode.success) {
                            const name = record.getField(FieldId.FID_NAME).value;
                            if (name != null && newSymbolInfo.name.length === 0) {
                                newSymbolInfo.name = name as string;
                            }
                        }
                        break;
                }

                this.updateRow(newSymbolInfo);
            }
        }
    }

    /**
     * Show or create a child window with an ACTIV example WebComponent.
     *
     * @param symbolInfo the symbol to open a window for.
     * @param windowType the type of window to open.
     */
    private async showWindow(symbolInfo: SymbolInfo, windowType: WindowType) {
        // We only allow one instance of each type of window per symbol.
        let windowInfo = symbolInfo.windows[windowType];

        if (windowInfo == null) {
            // Create window and set initial symbol and title.
            windowInfo = await this.windowManager.createWindow(windowType);
            windowInfo.updateSymbol(symbolInfo.symbol);

            // Attach to cg-api.
            if (this.clientPromise != null) {
                windowInfo.component.connect(this.clientPromise);
            }

            // Handle removing.
            windowInfo.finWindow.addEventListener("closed", () => delete symbolInfo.windows[windowType]);

            symbolInfo.windows[windowType] = windowInfo;
        }

        windowInfo.finWindow.show();
        windowInfo.finWindow.focus();
    }
}

export default App;
