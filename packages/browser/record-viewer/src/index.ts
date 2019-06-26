/*
 * RecordViewer custom element.
 */

import {
    Client,
    Streaming,
    Field,
    FieldId,
    FieldType,
    TableNumber,
    StatusCode,
    TRational,
    StatusCodeError
} from "@activfinancial/cg-api";
import { IExample, IExampleStats, ExampleStats } from "@activfinancial/cg-api";

import {
    formatField as formatFieldInternal,
    applyTrendStyle,
    clearTrendStyle,
    getTrendHelperFromString
} from "../../common/formatFieldValue";
import { addUnloadHandler } from "../../../common/utils";

// Note leading ! overrides webpack config matching css files.
import commonCss from "!raw-loader!../../common/common.css";
import indexCss from "!raw-loader!../style/index.css";

import indexHtml from "!raw-loader!./index.html";
import fieldHtml from "!raw-loader!./field.html";

import { props, withLifecycle, withRenderer, withUpdate } from "skatejs";

// ---------------------------------------------------------------------------------------------------------------------------------

/** "---" for undefined fields. */
function formatField(field: Field): string {
    return formatFieldInternal(field, { undefinedText: "---" });
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** State of each field. */
interface FieldData {
    /** Display name for field. */
    name: string;

    /** Element in DOM. */
    element: HTMLElement;

    /** Renderer. */
    render: (field: Field) => void;
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Trending overrides for some fields.
type FieldIdTrends = { [key in FieldId]?: string };

const fieldIdTrends: FieldIdTrends = {
    [FieldId.FID_NET_CHANGE]: "value",
    [FieldId.FID_PERCENT_CHANGE]: "value"
    // Anything else is "tick".
};

// ---------------------------------------------------------------------------------------------------------------------------------

// TODO surely we can automagically generate this (or vice-versa) from the props static below? Too much repetition.
/** Attributes interface. */
interface Attributes {
    symbol: string;
    "conflation-type": "none" | keyof typeof Streaming.ConflationType;
    "conflation-interval": number;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * RecordViewer WebComponent.
 */
class RecordViewer extends withLifecycle(withRenderer(withUpdate())) implements IExample {
    private readonly rootElement: HTMLDivElement;
    private readonly symbolLabel: HTMLHeadingElement;
    private readonly exchangeLabel: HTMLHeadingElement;
    private readonly tableLabel: HTMLHeadingElement;
    private readonly filterValue: HTMLInputElement;
    private readonly body: HTMLTableElement;
    private readonly status: HTMLDivElement;
    private readonly overlay: HTMLDivElement;

    private clientPromise: Promise<Client> | null = null;
    private client: Client | null = null;
    private requestHandle: Streaming.RequestHandle | null = null;

    private fields: FieldData[] = [];

    private stats = new ExampleStats();

    // A Field to represent UpdateId, as it isn't in FieldData in an update.
    private updateIdField = {
        id: FieldId.FID_UPDATE_ID,
        statusCode: StatusCode.success,
        doesUpdateLastValue: true,
        type: FieldType.uInt,
        value: 0
    };

    // props.
    symbol: string = "";
    conflationType: string = "none";
    conflationInterval: number = 500;

    static readonly props = {
        symbol: props.string,
        conflationType: props.string,
        conflationInterval: props.number
    };

    constructor() {
        super();

        this.rootElement = document.createElement("div");
        this.rootElement.className = "activ-cg-api-webcomponent record-viewer";
        this.rootElement.innerHTML = `<style>${commonCss}${indexCss}</style>${indexHtml}`;
        (this.renderRoot as HTMLElement).appendChild(this.rootElement);

        this.tableLabel = this.rootElement.querySelector(".record-viewer-title-table") as HTMLHeadingElement;
        this.exchangeLabel = this.rootElement.querySelector(".record-viewer-title-exchange") as HTMLHeadingElement;
        this.symbolLabel = this.rootElement.querySelector(".record-viewer-title-symbol") as HTMLHeadingElement;

        // Function for any activity in the filter input; just update visible state for all fields.
        const handleFilterEvent = (e: Event) => {
            e.preventDefault();

            for (const fieldData of this.fields) {
                if (fieldData != null) {
                    this.setFieldElementVisibility(fieldData.element, fieldData.name);
                }
            }
        };

        const filterForm = this.rootElement.querySelector(".record-viewer-filter-form") as HTMLFormElement;
        filterForm.addEventListener("submit", handleFilterEvent);

        this.filterValue = this.rootElement.querySelector(".record-viewer-filter-value") as HTMLInputElement;
        this.filterValue.addEventListener("keyup", handleFilterEvent);
        this.filterValue.addEventListener("search", handleFilterEvent);
        this.filterValue.addEventListener("change", handleFilterEvent);

        this.body = this.rootElement.querySelector(".record-viewer-body") as HTMLTableElement;
        this.status = this.rootElement.querySelector(".record-viewer-status") as HTMLDivElement;
        this.overlay = this.rootElement.querySelector(".record-viewer-overlay") as HTMLDivElement;

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

            // Get cached field info from server. We won't await until we need it.
            this.client.metaData.getUniversalFieldHelperList();

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

    updated() {
        this.subscribe();
    }

    disconnected() {
        this.unsubscribe();
    }

    async subscribe() {
        this.unsubscribe();

        this.symbolLabel.textContent = this.symbol;
        if (this.client == null || this.symbol === "") {
            return;
        }

        this.stats = new ExampleStats();
        this.setStatus("Subscribing...");

        try {
            const requestParameters: Streaming.GetMatchParameters = {
                key: this.symbol,
                matchType: Streaming.GetMatchType.composite,
                relationships: {
                    /* Empty Relationship will get all fields. */
                },
                subscription: {
                    updateHandler: (update: Streaming.Update) => this.processUpdate(update)
                }
            };

            if (this.conflationType !== "none") {
                requestParameters.subscription!.conflation = {
                    type: Streaming.ConflationType[this.conflationType as keyof typeof Streaming.ConflationType],
                    interval: this.conflationInterval
                };
            }

            // Initiate the async request.
            this.requestHandle = this.client.streaming.getMatch(requestParameters);

            // Asynchronously iterate all records resulting from the request.
            // Here we'll only ever have 1 record though.
            for await (const record of this.requestHandle) {
                if (0 === this.stats.responsesReturned) {
                    this.setStatus(null);
                    this.stats.initialResponseTimestamp = performance.now();
                }

                if (StatusCode.success !== record.statusCode) {
                    throw new StatusCodeError(record.statusCode);
                }

                this.processRecord(record);
            }

            this.stats.renderingCompleteTimestamp = performance.now();
        } catch (e) {
            this.setStatus(`Error subscribing: ${e}`);
        }
    }

    getStats(): IExampleStats {
        return this.stats;
    }

    private unsubscribe() {
        this.body.innerHTML = "";

        if (this.requestHandle != null) {
            this.requestHandle.delete();
            this.requestHandle = null;
        }
    }

    private async processRecord(record: Streaming.Image) {
        ++this.stats.responsesReturned;
        this.fields = [];

        this.symbolLabel.textContent = record.responseKey.symbol;

        {
            // Might receive a new table number not in the enumeration.
            const tableName = TableNumber[record.responseKey.tableNumber];
            this.tableLabel.textContent =
                tableName == null
                    ? `Table number ${record.responseKey.tableNumber}`
                    : `${tableName} (${record.responseKey.tableNumber})`;
        }

        (async () => {
            this.exchangeLabel.textContent = (await this.client!.metaData.getExchangeInfo(record.responseKey.symbol)).name;
        })();

        for (const field of record.fieldData) {
            let fieldHelper = this.client!.metaData.getUniversalFieldHelper(field.id);
            if (fieldHelper instanceof Promise) {
                fieldHelper = await fieldHelper;
            }
            const fieldData = this.createFieldData(field.id, fieldHelper.name, fieldHelper.description);

            // Render the initial value, attach to document and cache.
            fieldData.render(field);
            this.body.appendChild(fieldData.element);
            this.fields[field.id] = fieldData;
        }
    }

    private processUpdate(update: Streaming.Update) {
        ++this.stats.totalUpdates;
        for (const field of update.fieldData) {
            if (field.doesUpdateLastValue) {
                this.updateField(field);
            }
        }

        // Special case for updateId as it's not in FieldData.
        this.updateIdField.value = update.updateId;
        this.updateField(this.updateIdField);
    }

    private updateField(field: Field) {
        const fieldData = this.fields[field.id];
        if (fieldData != null) {
            fieldData.render(field);
        }
    }

    private createFieldData(fieldId: FieldId, fieldName: string, fieldDescription: string) {
        const element = document.createElement("div");
        element.className = "record-viewer-field";
        element.innerHTML = fieldHtml;

        this.setFieldElementVisibility(element, fieldName);

        const nameElement = element.querySelector(".record-viewer-field-name") as HTMLDivElement;
        nameElement.textContent = fieldName;
        nameElement.title = `${FieldId[fieldId] || ""} (${fieldId})\n${fieldDescription}`;

        const valueElement = element.querySelector(".record-viewer-field-value") as HTMLDivElement;
        const getTrendHelper = getTrendHelperFromString(fieldId, fieldIdTrends[fieldId] || "tick");

        const render = (field: Field) => {
            valueElement.textContent = formatField(field);

            if (field.type === FieldType.tRational) {
                applyTrendStyle(getTrendHelper(field.value as TRational), valueElement);
            } else if (field.value == null) {
                clearTrendStyle(valueElement);
            }
        };

        return { name: fieldName, element, render };
    }

    private setFieldElementVisibility(element: HTMLElement, fieldName: string) {
        const isVisible = fieldName.toLowerCase().includes(this.filterValue.value.toLowerCase());

        element.style.display = isVisible ? "" : "none";
    }

    private setStatus(message: string | null) {
        this.status.textContent = message;
        this.overlay.style.display = message == null ? "none" : "";
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

window.customElements.define("record-viewer", RecordViewer);

export { Attributes };
export default RecordViewer;
