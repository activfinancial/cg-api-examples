/*
 * TpiViewer custom element.
 */

import { Client, Streaming, Field, FieldData } from "@activfinancial/cg-api";

import { formatField } from "../../common/formatFieldValue";
import { addUnloadHandler } from "../../../common/utils";

// Note leading ! overrides webpack config matching css files.
import commonCss from "!raw-loader!../../common/common.css";
import indexCss from "!raw-loader!../style/index.css";

import indexHtml from "!raw-loader!./index.html";

// HACK sort this out properly. Can't get a WebComponent importing fontawesome like cg-api-explorer.
import angleLeft from "!url-loader!@fortawesome/fontawesome-free/svgs/solid/angle-left.svg";
import angleRight from "!url-loader!@fortawesome/fontawesome-free/svgs/solid/angle-right.svg";

import { LitElement, PropertyValues, customElement, property } from "lit-element";

// ---------------------------------------------------------------------------------------------------------------------------------

// TODO surely we can automagically generate this (or vice-versa) from the props below? Too much repetition.
/** Attributes interface. */
interface Attributes {
    symbol: string;
    "conflation-type": "none" | keyof typeof Streaming.ConflationType;
    "conflation-interval": number;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * TpiViewer WebComponent.
 */
@customElement("tpi-viewer")
class TpiViewer extends LitElement {
    private readonly rootElement: HTMLDivElement;
    private readonly symbolLabel: HTMLHeadingElement;
    private readonly body: HTMLTableElement;
    private readonly status: HTMLDivElement;
    private readonly overlay: HTMLDivElement;

    private clientPromise: Promise<Client> | null = null;
    private client: Client | null = null;
    private requestHandle: Streaming.RequestHandle | null = null;

    private fields: HTMLElement[] = [];

    private static readonly tpiTable = 5001;
    private static readonly tpiDateFieldId = 5017;
    private static readonly tpiTimeFieldId = 5005;
    private static readonly firstLineFieldId = 5315;
    private static readonly numberOfLines = 25;

    // Used by stats.js in website.
    subscribeTimestamp: number = 0;
    initialResponseTimestamp: number = 0;
    renderingCompleteTimestamp: number = 0;
    responsesReturned: number = 0;
    totalUpdates: number = 0;

    // props.
    @property()
    symbol: string = "";

    @property({ attribute: "conflation-type" })
    conflationType: string = "none";

    @property({ attribute: "conflation-interval", type: Number })
    conflationInterval: number = 500;

    constructor() {
        super();

        this.rootElement = document.createElement("div");
        this.rootElement.className = "activ-cg-api-webcomponent tpi-viewer";
        this.rootElement.innerHTML = `<style>${commonCss}${indexCss}</style>${indexHtml}`;
        (this.renderRoot as HTMLElement).appendChild(this.rootElement);

        this.symbolLabel = this.rootElement.querySelector(".tpi-viewer-title-symbol") as HTMLHeadingElement;

        this.body = this.rootElement.querySelector(".tpi-viewer-body") as HTMLTableElement;
        this.status = this.rootElement.querySelector(".tpi-viewer-status") as HTMLDivElement;
        this.overlay = this.rootElement.querySelector(".tpi-viewer-overlay") as HTMLDivElement;

        let button = this.rootElement.querySelector(".tpi-viewer-previous") as HTMLButtonElement;
        button.style.backgroundImage = `url('${angleLeft}')`;
        button.addEventListener("click", () => this.getNextPrevious(false));

        button = this.rootElement.querySelector(".tpi-viewer-next") as HTMLButtonElement;
        button.style.backgroundImage = `url('${angleRight}')`;
        button.addEventListener("click", () => this.getNextPrevious(true));

        // Pre-create fields.
        for (let fieldId = TpiViewer.firstLineFieldId; fieldId < TpiViewer.firstLineFieldId + TpiViewer.numberOfLines; ++fieldId) {
            const element = document.createElement("div");
            element.className = "tpi-viewer-field";

            this.body.appendChild(element);
            this.fields[fieldId] = element;
        }

        // Date/time handling.
        this.fields[TpiViewer.tpiDateFieldId] = this.rootElement.querySelector(".tpi-viewer-title-date") as HTMLElement;
        this.fields[TpiViewer.tpiTimeFieldId] = this.rootElement.querySelector(".tpi-viewer-title-time") as HTMLElement;

        addUnloadHandler(() => this.unsubscribe());

        this.setStatus("Waiting...");
    }

    async connect(clientPromise: Promise<Client>) {
        if (this.clientPromise === clientPromise) {
            return;
        }

        this.clientPromise = clientPromise;
        this.setStatus("Connecting...");

        try {
            this.client = await clientPromise;
        } catch (e) {
            this.setStatus(`Error connecting: ${e}`);
            throw e;
        }

        try {
            this.setStatus("Connected");
            this.subscribe();

            // Wait for a break or disconnection.
            await this.client.disconnected;
            this.setStatus("Disconnected");
        } catch (e) {
            this.setStatus(`Connection broken: ${e}`);
        } finally {
            this.unsubscribe();
            this.client = null;
        }
    }

    shouldUpdate(changedProperties: PropertyValues) {
        // Check for properties that require a resubscribe if they change.
        // TODO automate this from the Attributes interface somehow...
        // TODO what's the right thing to do here? We're setting this.symbol on hitting next/previous
        // button, which triggers an updated() call. But we don't want to do anything since we've
        // already subscribed to the new symbol.
        if (
            (changedProperties.has("symbol") && this.symbol !== this.symbolLabel.textContent) ||
            changedProperties.has("conflationType") ||
            changedProperties.has("conflationInterval")
        ) {
            this.subscribe();
        }

        return true;
    }

    disconnectedCallback() {
        this.unsubscribe();
    }

    private subscribe() {
        this.resetStats();
        this.setStatus("Subscribing...");

        if (this.symbol.length === 0) {
            this.getFirst();
        } else {
            this.getEqual();
        }
    }

    private setConflationParameters(requestParameters: Streaming.RequestParameters) {
        if (this.conflationType !== "none") {
            requestParameters.subscription!.conflation = {
                type: Streaming.ConflationType[this.conflationType as keyof typeof Streaming.ConflationType],
                interval: this.conflationInterval
            };
        }
    }

    private unsubscribe() {
        for (const element of this.fields) {
            if (element != null) {
                element.innerHTML = "";
            }
        }

        if (this.requestHandle != null) {
            this.requestHandle.delete();
            this.requestHandle = null;
        }
    }

    private resetStats() {
        this.subscribeTimestamp = performance.now();
        this.initialResponseTimestamp = this.subscribeTimestamp;
        this.renderingCompleteTimestamp = this.subscribeTimestamp;
        this.responsesReturned = 0;
        this.totalUpdates = 0;
    }

    private getEqual() {
        if (this.client == null) {
            return;
        }

        try {
            const requestParameters: Streaming.GetEqualParameters = {
                key: this.symbol,
                relationships: {
                    /* Empty Relationship will get all fields. */
                },
                subscription: {
                    updateHandler: (update: Streaming.Update) => this.processUpdate(update)
                }
            };

            // Initiate the async request.
            this.setConflationParameters(requestParameters);
            const requestHandle = this.client.streaming.getEqual(requestParameters);
            this.processResponse(requestHandle);
        } catch (e) {
            this.setStatus(`Error subscribing: ${e}`);
        }
    }

    private getFirst() {
        if (this.client == null) {
            return;
        }

        try {
            const requestParameters: Streaming.GetFirstLastParameters = {
                key: TpiViewer.tpiTable,
                relationships: {
                    /* Empty Relationship will get all fields. */
                },
                subscription: {
                    updateHandler: (update: Streaming.Update) => this.processUpdate(update)
                }
            };

            // Initiate the async request.
            this.setConflationParameters(requestParameters);
            const requestHandle = this.client.streaming.getFirst(requestParameters);
            this.processResponse(requestHandle);
        } catch (e) {
            this.setStatus(`Error subscribing: ${e}`);
        }
    }

    private getNextPrevious(isNext: boolean) {
        if (this.client == null) {
            return;
        }

        try {
            const requestParameters: Streaming.GetNextPreviousParameters = {
                key: { tableNumber: TpiViewer.tpiTable, symbol: this.symbol },
                relationships: {
                    /* Empty Relationship will get all fields. */
                },
                subscription: {
                    updateHandler: (update: Streaming.Update) => this.processUpdate(update)
                }
            };

            // Initiate the async request.
            this.setConflationParameters(requestParameters);
            const requestFn = isNext ? this.client.streaming.getNext : this.client.streaming.getPrevious;
            const requestHandle = requestFn(requestParameters);

            this.processResponse(requestHandle);
        } catch (e) {
            this.setStatus(`Error subscribing: ${e}`);
        }
    }

    private async processResponse(requestHandle: Streaming.RequestHandle) {
        // Asynchronously iterate all records resulting from the request.
        // Here we'll only ever have 1 record though.
        for await (const record of requestHandle!) {
            if (0 === this.responsesReturned) {
                this.setStatus(null);
                this.initialResponseTimestamp = performance.now();
            }

            this.processRecord(requestHandle, record);
        }

        this.renderingCompleteTimestamp = performance.now();
    }

    private async processRecord(requestHandle: Streaming.RequestHandle, record: Streaming.Image) {
        ++this.responsesReturned;

        // Successfully subscribed to new record, so kill any old one.
        this.unsubscribe();
        this.requestHandle = requestHandle;

        this.symbolLabel.textContent = record.responseKey.symbol;
        this.symbol = record.responseKey.symbol;
        this.processFieldData(record.fieldData);
    }

    private processUpdate(update: Streaming.Update) {
        ++this.totalUpdates;
        this.processFieldData(update.fieldData);
    }

    private processFieldData(fieldData: FieldData) {
        for (const field of fieldData) {
            if (field.doesUpdateLastValue) {
                const element = this.fields[field.id];
                if (element != null) {
                    element.textContent = formatField(field);
                }
            }
        }
    }

    private setStatus(message: string | null) {
        this.status.textContent = message;
        this.overlay.style.display = message == null ? "none" : "";
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

export { Attributes };
export default TpiViewer;
