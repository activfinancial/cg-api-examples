/*
 * OpenFin container for cg-api samples.
 */

import { version as appVersion } from "../package.json";

import {
    connect as cgConnect,
    Client,
    FieldId,
    PermissionId,
    RelationshipId,
    StatusCode,
    Streaming,
    asyncSleep
} from "@activfinancial/cg-api";

import OptionChain from "@activfinancial/option-chain";
import NewsViewer from "@activfinancial/news-viewer";
import Chart from "@activfinancial/time-series-chart";
import RecordViewer from "@activfinancial/record-viewer";

import symbolTableRow from "!html-loader!./symbolTableRow.html";

import { desktopReady, createChildWindow, getWindowOptions } from "../../common/utils";
import { domReady, isOpenFin } from "../../../common/utils";
import { addContextMenu } from "./jqueryUtils";

import "jquery";
import "openfin";
import "bootstrap";

// CSS.
import "bootstrap-custom.less";
import "bootstrap/less/theme.less";
import "html5-boilerplate/dist/css/main.css";
import "common.css";
import "main.css";

// ---------------------------------------------------------------------------------------------------------------------------------

// Common interface for all window components.
interface WindowComponent extends HTMLElement {
    connect(contentGatewayClientPromise: Promise<Client>): Promise<void>;
}

// Info stored about open windows.
interface WindowInfo<T extends WindowComponent> {
    finWindow: fin.OpenFinWindow;
    htmlWindow: Window;
    component: T;
}

// Type for set of string id -> window info.
interface WindowSet<T extends WindowComponent> {
    [key: string]: WindowInfo<T>;
}

/** Tracker for app windows. */
class WindowManager<T extends WindowComponent> {
    private windowSet: WindowSet<T> = {};
    private windowId: number = 0;

    constructor(private readonly elementName: string, private readonly defaultOptions?: Partial<fin.WindowOption>) {}

    hasWindow(key: string): WindowInfo<T> | null {
        return this.windowSet[key];
    }

    static showWindow(window: fin.OpenFinWindow) {
        window.show();
        window.focus();
    }

    async createWindow(key: string, options: fin.WindowOption) {
        try {
            const { window, promise } = createChildWindow({
                name: `${this.elementName}${++this.windowId}`,
                url: `${this.elementName}.html`,
                ...this.defaultOptions,
                ...options
            });

            // Wait for window to be created.
            await promise;

            const htmlWindow = window.getNativeWindow();
            const component = htmlWindow.document.querySelector(this.elementName) as T;

            // Create and store window info.
            const windowInfo = {
                finWindow: window,
                htmlWindow,
                component
            };

            window.addEventListener("closed", () => this.deleteWindow(key));
            this.windowSet[key] = windowInfo;

            return windowInfo;
        } catch (e) {
            alert(`Failed to create window due to ${e.reason}`);
            return null;
        }
    }

    updateWindows(contentGatewayClientPromise: Promise<Client>) {
        for (const window in this.windowSet) {
            this.windowSet[window].component.connect(contentGatewayClientPromise);
        }
    }

    private deleteWindow(key: string) {
        delete this.windowSet[key];
    }
}

interface Windows {
    [key: string]: WindowManager<any>;
}

// ---------------------------------------------------------------------------------------------------------------------------------

interface SymbolInfo {
    permissionId: PermissionId;
    name: string;
}

interface SymbolInfoMap {
    [symbol: string]: SymbolInfo;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** OpenFin workstation main app. */
class ActivWorkstation {
    private contentGatewayClient: Client | null = null;
    private symbolInfoMap: SymbolInfoMap = {};

    // Child windows.
    private readonly windows: Windows = {
        "option-chain": new WindowManager<OptionChain>("option-chain", {
            defaultWidth: 1100,
            defaultHeight: 800
        }),
        "record-viewer": new WindowManager<RecordViewer>("record-viewer", {
            defaultWidth: 1100,
            defaultHeight: 800
        }),
        "news-viewer": new WindowManager<NewsViewer>("news-viewer", {
            defaultWidth: 1100,
            defaultHeight: 800
        }),
        chart: new WindowManager<Chart>("time-series-chart", {
            defaultWidth: 800,
            defaultHeight: 600
        })
    };

    // Symbol table fields.
    static symbolTableFields = [
        {
            heading: "Name",
            attributes: {
                fieldType: "substituteField"
                // dataBinding: activ.consts.FieldIds.FID_NAME + ";" + activ.consts.RelationshipId.RELATIONSHIP_ID_COMPANY,
                // dataBinding2: activ.consts.FieldIds.FID_NAME
            }
        },
        {
            heading: "Permission Id",
            attributes: {
                fieldType: "field",
                dataBinding: 441
            }
        }
    ];

    // Holds the key names used for the main window's localStorage.
    static storageKeys = {
        address: "activFeedAddress",
        password: "activFeedPassword",
        symbol: "activWorkstation.finder.symbol",
        userId: "activFeedUserId"
    };

    private readonly connectionForm = document.querySelector("#connectionForm") as HTMLFormElement;
    private readonly isConnectedElement = document.querySelector("#connectedIndicator") as HTMLElement;
    private readonly connectionStatusText = document.querySelector("#connectionStatusText") as HTMLElement;
    private readonly symbolsTableElement = document.querySelector("#symbolsTable") as HTMLTableElement;

    constructor(private readonly childWindowOptions: fin.WindowOption) {
        this.setConnectionFormEventHandlers();

        const addressInput = this.connectionForm.address;
        const address = localStorage.getItem(ActivWorkstation.storageKeys.address);
        const password = localStorage.getItem(ActivWorkstation.storageKeys.password);
        const userId = localStorage.getItem(ActivWorkstation.storageKeys.userId);

        if (address != null) {
            addressInput.value = address;
        }

        if (password != null) {
            this.connectionForm.password.value = password;
        }

        if (userId != null) {
            this.connectionForm.userId.value = userId;
        }

        if (password != null && userId != null && addressInput.value !== "") {
            this.enableConnectionControls(false);

            this.connect(addressInput.value, userId, password);
        } else {
            this.showConnectionModal(true);
        }
    }

    // Enable/disable connect parameters form controls.
    private enableConnectionControls(enabled: boolean) {
        this.connectionForm.address.disabled = !enabled;
        this.connectionForm.userId.disabled = !enabled;
        this.connectionForm.password.disabled = !enabled;
        this.connectionForm.connect.disabled = !enabled;
        this.connectionForm.disconnect.disabled = enabled;
    }

    private showConnectionModal(isShow: boolean | undefined) {
        const dialog = jQuery("#connectionFormModal");

        if (isShow == null) {
            dialog.modal("toggle");
        } else if (isShow) {
            dialog.modal("show");
        } else {
            dialog.modal("hide");
        }
    }

    // Enable/disable symbol controls.
    private enableSymbolControls(isEnabled: boolean) {
        for (const form of Array.from(this.symbolsTableElement.querySelectorAll("input"))) {
            form.disabled = !isEnabled;
        }
    }

    private addFieldHeader(headerRowElement: HTMLElement, heading: string) {
        const thElement = document.createElement("th");

        thElement.textContent = heading;
        headerRowElement.appendChild(thElement);
    }

    private showQuotePage(symbol: string, windowListKey: string) {}

    private async showOptionChain(symbol: string) {
        const windowSet = this.windows["option-chain"];

        let windowInfo = windowSet.hasWindow(symbol);
        if (windowInfo == null) {
            windowInfo = await windowSet.createWindow(symbol, this.childWindowOptions);
            if (windowInfo == null) {
                return;
            }
            windowInfo.htmlWindow.document.title = `Options for ${symbol}`;

            const optionChain = windowInfo.component as OptionChain;
            optionChain.symbol = symbol;
            optionChain.connect(Promise.resolve(this.contentGatewayClient!));
        }

        WindowManager.showWindow(windowInfo.finWindow);
    }

    private async showRecordViewer(symbol: string) {
        const windowSet = this.windows["record-viewer"];

        let windowInfo = windowSet.hasWindow(symbol);
        if (windowInfo == null) {
            windowInfo = await windowSet.createWindow(symbol, this.childWindowOptions);
            if (windowInfo == null) {
                return;
            }
            windowInfo.htmlWindow.document.title = `Record viewer for ${symbol}`;

            const optionChain = windowInfo.component as RecordViewer;
            optionChain.symbol = symbol;
            optionChain.connect(Promise.resolve(this.contentGatewayClient!));
        }

        WindowManager.showWindow(windowInfo.finWindow);
    }

    private async showNewsViewer(symbol: string) {
        const windowSet = this.windows["news-viewer"];

        let windowInfo = windowSet.hasWindow(symbol);
        if (windowInfo == null) {
            windowInfo = await windowSet.createWindow(symbol, this.childWindowOptions);
            if (windowInfo == null) {
                return;
            }
            windowInfo.htmlWindow.document.title = `News for ${symbol}`;

            const newsViewer = windowInfo.component as NewsViewer;
            newsViewer.query = `symbol=${symbol}`;
            newsViewer.connect(Promise.resolve(this.contentGatewayClient!));
        }

        WindowManager.showWindow(windowInfo.finWindow);
    }

    private async showChart(symbol: string) {
        const windowSet = this.windows["chart"];

        let windowInfo = windowSet.hasWindow(symbol);
        if (windowInfo == null) {
            windowInfo = await windowSet.createWindow(symbol, this.childWindowOptions);
            if (windowInfo == null) {
                return;
            }
            windowInfo.htmlWindow.document.title = `Closing prices for ${symbol}`;

            const timeSeriesChart = windowInfo.component as Chart;
            timeSeriesChart.symbol = symbol;
            timeSeriesChart.connect(Promise.resolve(this.contentGatewayClient!));
        }

        WindowManager.showWindow(windowInfo.finWindow);
    }

    private redrawSymbolsTable() {
        const selectSymbolInputOnRowClick = (row: HTMLElement, symbolInput: HTMLInputElement) => {
            row.addEventListener("click", () => {
                symbolInput.select();
                symbolInput.focus();
            });
        };

        const newThead = document.createElement("thead");
        const headerRowElement = newThead.insertRow();

        this.addFieldHeader(headerRowElement, "Symbol");

        for (const field of ActivWorkstation.symbolTableFields) {
            this.addFieldHeader(headerRowElement, field.heading);
        }

        const newTbody = document.createElement("tbody");
        const symbols = Object.keys(this.symbolInfoMap);

        for (const symbol of symbols) {
            const symbolInfo = this.symbolInfoMap[symbol];
            const symbolRowElement = newTbody.insertRow();

            symbolRowElement.innerHTML = symbolTableRow;
            symbolRowElement.className = "symbol-list-row";

            // Symbol.
            const inputElement = symbolRowElement.querySelector(".symbol-link") as HTMLInputElement;
            selectSymbolInputOnRowClick(symbolRowElement, inputElement);

            inputElement.value = symbol;
            inputElement.setAttribute("symbol", symbol);

            // If contents are edited to empty, delete the row (i.e. no need to hit enter).
            inputElement.addEventListener("input", () => {
                if (inputElement.value === "") {
                    const oldSymbol = inputElement.getAttribute("symbol");
                    if (oldSymbol != null) {
                        delete this.symbolInfoMap[oldSymbol];
                        this.redrawSymbolsTable();
                    }
                }
            });

            // Attach context menu to symbol link button.
            jQuery(symbolRowElement).contextMenu({
                menuSelector: "#symbolsContextMenu",
                menuItemSelectedCallback: (openMenuEventTarget: any, selectedMenuItem: any) => {
                    const symbol = openMenuEventTarget[0].getAttribute("symbol");

                    if (symbol != null && symbol.length > 0) {
                        switch (selectedMenuItem.attr("href")) {
                            // case "quote.html":
                            //     let targetWindowListKey = selectedMenuItem.data("activTargetWindowListKey");

                            //     if (targetWindowListKey === undefined) {
                            //         var windowKeys = Object.keys(this.finQuotePages);
                            //         targetWindowListKey = windowKeys.length > 0 ? Math.max.apply(Math, windowKeys) : 0;
                            //         targetWindowListKey += 1;
                            //         targetWindowListKey = targetWindowListKey.toString(10);
                            //     }

                            //     this.showQuotePage(symbol, targetWindowListKey);
                            //     break;

                            case "option-chain.html":
                                this.showOptionChain(symbol);
                                break;

                            case "record-viewer.html":
                                this.showRecordViewer(symbol);
                                break;

                            case "news-viewer.html":
                                this.showNewsViewer(symbol);
                                break;

                            case "time-series-chart.html":
                                this.showChart(symbol);
                                break;
                        }
                    }
                },
                menuOpeningEvents: "contextmenu"
            });

            const form = symbolRowElement.querySelector(".symbol-input-form") as HTMLFormElement;
            form.addEventListener("submit", (event: Event) => {
                event.preventDefault();

                // Delete old entry.
                delete this.symbolInfoMap[symbol];

                if (inputElement.value !== "") {
                    this.getSymbolInfo(inputElement.value);
                } else {
                    this.redrawSymbolsTable();
                }
            });

            // TODO tidy this up to avoid hard coded indexes.
            symbolRowElement.children[1].textContent = symbolInfo.name;
            symbolRowElement.children[1].setAttribute("symbol", symbol);

            symbolRowElement.children[2].textContent = PermissionId[symbolInfo.permissionId];
            symbolRowElement.children[2].setAttribute("symbol", symbol);
        }

        // Last item is blank for new symbols.
        const symbolRowElement = newTbody.insertRow();
        symbolRowElement.innerHTML = symbolTableRow;
        symbolRowElement.className = "symbol-list-row";
        const inputElement = symbolRowElement.querySelector(".symbol-link") as HTMLInputElement;
        selectSymbolInputOnRowClick(symbolRowElement, inputElement);

        const form = symbolRowElement.querySelector(".symbol-input-form") as HTMLFormElement;
        form.addEventListener("submit", async (event: Event) => {
            event.preventDefault();
            const symbol = inputElement.value.trim();
            this.getSymbolInfo(symbol);
        });

        const oldThead = this.symbolsTableElement.tHead!;
        const oldTbody = this.symbolsTableElement.getElementsByTagName("tbody")[0]!;

        oldThead.parentElement!.replaceChild(newThead, oldThead);
        oldTbody.parentElement!.replaceChild(newTbody, oldTbody);

        inputElement.focus();

        // Store resolved symbols.
        localStorage.setItem(ActivWorkstation.storageKeys.symbol, JSON.stringify(symbols));
    }

    private setConnectionFormEventHandlers() {
        const connectButton = document.querySelector("#connect") as HTMLButtonElement;
        const userIdInput = document.querySelector("#userId") as HTMLInputElement;
        const passwordInput = document.querySelector("#password") as HTMLInputElement;

        function enableConnectButton() {
            connectButton.disabled =
                userIdInput.value === userIdInput.defaultValue || passwordInput.value === passwordInput.defaultValue;
        }

        passwordInput.addEventListener("input", enableConnectButton);
        userIdInput.addEventListener("input", enableConnectButton);

        this.connectionForm.addEventListener("submit", (submitEvent) => {
            submitEvent.preventDefault();

            this.enableConnectionControls(false);

            localStorage.setItem(ActivWorkstation.storageKeys.address, this.connectionForm.address.value);
            localStorage.setItem(ActivWorkstation.storageKeys.password, this.connectionForm.password.value);
            localStorage.setItem(ActivWorkstation.storageKeys.userId, this.connectionForm.userId.value);

            this.connect(this.connectionForm.address.value, this.connectionForm.userId.value, this.connectionForm.password.value);
        });

        this.connectionForm.disconnect.addEventListener("click", async () => this.disconnect());

        const showConnectionForm = document.getElementById("showConnectionForm") as HTMLFormElement;
        showConnectionForm.addEventListener("click", () => this.showConnectionModal(true));
    }

    private async getSymbolInfo(symbols: string | string[]) {
        const requestHandle = this.contentGatewayClient!.streaming.getMatch({
            key: symbols,
            matchType: Streaming.GetMatchType.composite,
            fieldIds: [FieldId.FID_NAME]
        });

        for await (const record of requestHandle) {
            const symbol = record.resolvedKey.symbol;
            if (record.statusCode === StatusCode.success) {
                let symbolInfo = this.symbolInfoMap[symbol];

                if (symbolInfo == null) {
                    symbolInfo = {
                        permissionId: PermissionId.unknown,
                        name: ""
                    };
                    this.symbolInfoMap[symbol] = symbolInfo;
                }

                switch (record.relationshipId) {
                    case RelationshipId.none:
                        symbolInfo.permissionId = record.permissionId;
                        break;

                    case RelationshipId.company:
                        const name = record.getField(FieldId.FID_NAME).value;
                        if (name != null) {
                            symbolInfo.name = name as string;
                        }
                        break;
                }
            }
        }

        this.redrawSymbolsTable();
    }

    private updateWindows() {
        for (const type in this.windows) {
            const windowSet = this.windows[type];
            windowSet.updateWindows(Promise.resolve(this.contentGatewayClient!));
        }
    }

    private async connect(url: string, userId: string, password: string) {
        const setConnectionControls = (isConnected: boolean, statusText: string) => {
            this.isConnectedElement.classList.toggle("active", isConnected);
            this.enableConnectionControls(!isConnected);
            this.enableSymbolControls(isConnected);
            this.connectionStatusText.textContent = statusText;
        };

        let isConnected = false;

        while (true) {
            try {
                this.disconnect();
                setConnectionControls(false, "Connecting...");
                this.isConnectedElement.classList.add("connecting");

                const contentGatewayClientPromise = cgConnect({
                    url,
                    userId,
                    password
                });

                this.contentGatewayClient = await contentGatewayClientPromise;

                isConnected = true;
                this.isConnectedElement.classList.remove("connecting");
                this.isConnectedElement.classList.remove("error");
                setConnectionControls(true, "");
                this.showConnectionModal(false);

                let shouldDrawTable = true;

                try {
                    const symbolsJson = localStorage.getItem(ActivWorkstation.storageKeys.symbol);
                    if (symbolsJson != null) {
                        const symbols = JSON.parse(symbolsJson);
                        if (symbols.length > 0) {
                            this.getSymbolInfo(symbols);
                            shouldDrawTable = false;
                        }
                    }
                } catch (e) {}

                if (shouldDrawTable) {
                    this.redrawSymbolsTable();
                }

                this.updateWindows();

                // Wait for disconnect to be hit or a break.
                await this.contentGatewayClient.disconnected;

                isConnected = false;
                setConnectionControls(false, "Disconnected");
                break;
            } catch (e) {
                const text = `Connection ${isConnected ? "broken" : "failed"}`;
                console.log(`${text}; ${e}`);
                setConnectionControls(false, `${text} (${e.message})`);
                this.isConnectedElement.classList.add("error");
            }

            await asyncSleep(5000);
        }
    }

    private disconnect() {
        if (this.contentGatewayClient != null) {
            this.contentGatewayClient.disconnect();
            this.contentGatewayClient = null;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Main entry point.
(async function() {
    if (!isOpenFin) {
        alert("This is an OpenFin application and will not run in a browser.");
        return;
    }

    document.title += ` ${appVersion}`;

    addContextMenu(window);

    // Wait for DOM then OpenFin to be ready.
    await domReady(document);
    await desktopReady();

    const mainWindow = fin.desktop.Application.getCurrent().getWindow();
    const mainWindowOptions = await getWindowOptions(mainWindow);

    // Options from app.json we want to propagate to child windows.
    const childWindowOptions = { contextMenu: mainWindowOptions.contextMenu };

    // Start main app.
    new ActivWorkstation(childWindowOptions);

    // Show main window after initialization.
    mainWindow.show();

    // TODO if user reloads main window, child windows end up orphaned. I can't see an event that can be subscribed to
    // in order to capture reload requestes and close them...
    // I'm guessing a solution might be to have the initial app a window-less "sentinel" that launches the real main
    // app and monitors it for "reloaded" events?
})();
