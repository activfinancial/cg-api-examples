/*
 * RecordViewer custom element.
 */

import {
    Client,
    Streaming,
    Field,
    FieldId,
    FieldType,
    StatusCode,
    TRational,
    Trend,
    StatusCodeError,
    TableNumber,
    formatField as formatFieldInternal
} from "@activfinancial/cg-api";
import { IExample, IExampleStats, ExampleStats } from "@activfinancial/cg-api";

import { getTrendHelperFromString } from "../../common/formatFieldValue";
import { addUnloadHandler } from "../../../common/utils";

// Note just using css-loader explicitly to get an object; not loading in to the page.
import commonCss from "!css-loader!../../common/common.css";
import indexCss from "!css-loader!../style/index.css";

import { LitElement, PropertyValues, html, customElement, property, css, unsafeCSS } from "lit-element";

// ---------------------------------------------------------------------------------------------------------------------------------

/** "---" for undefined fields. */
function formatField(field: Field): string {
    return formatFieldInternal(field, { undefinedText: "---" });
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** State of each field. */
interface FieldInfo {
    /** Display name for field. */
    name: string;

    /** Tooltip for field. */
    tooltip: string;

    /** Is the field visible? */
    isVisible: boolean;

    /** Field data from cg-api. */
    field: Field;

    /** Textual value to render. */
    textValue: string | null;

    /** Renderer. */
    render(): void;
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

// TODO surely we can automagically generate this (or vice-versa) from the props below? Too much repetition.
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
@customElement("record-viewer")
class RecordViewer extends LitElement implements IExample {
    private clientPromise: Promise<Client> | null = null;
    private client: Client | null = null;
    private requestHandle: Streaming.RequestHandle | null = null;

    private fields: FieldInfo[] = [];

    private stats = new ExampleStats();

    // A Field to represent UpdateId, as it isn't in FieldData in an update.
    private updateIdField = {
        id: FieldId.FID_UPDATE_ID,
        statusCode: StatusCode.success,
        doesUpdateLastValue: true,
        type: FieldType.uInt,
        value: 0
    };

    // Attributes.
    @property()
    symbol: string = "";

    @property({ attribute: "conflation-type" })
    conflationType: "none" | keyof typeof Streaming.ConflationType = "none";

    @property({ attribute: "conflation-interval", type: Number })
    conflationInterval: number = 500;

    // Internal state that causes re-render on change.
    @property()
    private tableName: string = "";

    @property()
    private tableNumber: TableNumber = TableNumber.undefined;

    @property()
    private symbolLabel: string = "";

    @property()
    private exchangeName: string = "";

    @property()
    private statusMessage: string | null = null;

    @property()
    private filterValue: string = "";

    // Styling.
    static get styles() {
        return css`${unsafeCSS(commonCss.toString())}${unsafeCSS(indexCss.toString())}`;
    }

    constructor() {
        super();

        // NB disconnectedCallback() doesn't fire when closing an Openfin window.
        // So we have to add our own.
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

            // Prime field info cache in the background. Note by the time we actually want the data,
            // it might not have arrived - so we'll still potentially have to await.
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

    shouldUpdate(changedProperties: PropertyValues) {
        // Check for properties that require a resubscribe if they change.
        // TODO automate this from the Attributes interface somehow...
        if (
            changedProperties.has("symbol") ||
            changedProperties.has("conflationType") ||
            changedProperties.has("conflationInterval")
        ) {
            this.subscribe();
        }

        return true;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribe();
    }

    getStats(): IExampleStats {
        return this.stats;
    }

    render() {
        if (this.statusMessage == null) {
            return html`
                <div class="activ-cg-api-webcomponent record-viewer">
                    <div class="record-viewer-header">
                        <div class="record-viewer-title">
                            <h1 class="record-viewer-title-symbol">${this.symbolLabel}</h1>
                            <h5 class="record-viewer-title-exchange">${this.exchangeName}</h5>
                            <h5 class="record-viewer-title-table">${this.tableName} (${this.tableNumber})</h5>
                        </div>
                        <form class="record-viewer-filter-form" @submit=${(e: Event) => e.preventDefault()}>
                            <input
                                class="record-viewer-filter-value"
                                type="search"
                                placeholder="Filter fields"
                                @keyup=${this.handleFilterEvent}
                                @search=${this.handleFilterEvent}
                                @change=${this.handleFilterEvent}
                            />
                        </form>
                    </div>

                    <div class="record-viewer-body">
                        ${this.fields.map((fieldInfo) => RecordViewer.renderField(fieldInfo))}
                    </div>
                </div>
            `;
        } else {
            // Status message fills whole display.
            return html`
                <div class="activ-cg-api-webcomponent record-viewer">
                    <div class="record-viewer-overlay">
                        <p class="record-viewer-status">${this.statusMessage}</p>
                    </div>
                </div>
            `;
        }
    }

    private static renderField(fieldInfo: FieldInfo) {
        if (fieldInfo.isVisible) {
            return html`
                <div class="record-viewer-field">
                    <div class="record-viewer-field-name" title=${fieldInfo.tooltip}>${fieldInfo.name}</div>
                    ${fieldInfo.render()}
                </div>
            `;
        } else {
            return html``;
        }
    }

    private async subscribe() {
        this.unsubscribe();

        if (this.client == null || this.symbol === "") {
            return;
        }

        this.symbolLabel = this.symbol;
        this.stats = new ExampleStats();
        this.setStatus("Subscribing...");

        try {
            const requestParameters: Streaming.GetMatchParameters = {
                key: this.symbol,
                matchType: Streaming.GetMatchType.composite,
                shouldMatchExact: true,
                subscription: {
                    updateHandler: this.processUpdate
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
            // Here we'll only ever have 1 record, though.
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

    private unsubscribe() {
        this.fields = [];
        this.tableName = "";
        this.tableNumber = TableNumber.undefined;
        this.symbolLabel = "";
        this.exchangeName = "";

        if (this.requestHandle != null) {
            this.requestHandle.delete();
            this.requestHandle = null;
        }
    }

    private async processRecord(record: Streaming.Image) {
        ++this.stats.responsesReturned;

        this.symbolLabel = record.responseKey.symbol;

        this.client!.metaData.getExchangeInfo(record.responseKey.symbol).then((exchangeInfo) => {
            this.exchangeName = exchangeInfo.name;
        });

        this.client!.metaData.getTableSpecification(record.permissionLevel, record.responseKey.tableNumber).then(
            (tableSpecification) => {
                this.tableName = tableSpecification.tableName;
                this.tableNumber = tableSpecification.tableNumber;
            }
        );

        for (const field of record.fieldData) {
            this.createFieldInfo(field);
        }

        // NB this.symbolLabel is registered as a property so we'll get a re-render scheduled automatically.
    }

    private readonly processUpdate = (update: Streaming.Update) => {
        ++this.stats.totalUpdates;

        for (const field of update.fieldData) {
            if (field.doesUpdateLastValue) {
                this.updateField(field);
            }
        }

        // Special case for updateId as it's not in FieldData in an update (but was in the response).
        this.updateIdField.value = update.updateId;
        this.updateField(this.updateIdField);

        // Schedule a render.
        this.requestUpdate();
    };

    private updateField(field: Field) {
        const fieldInfo = this.fields[field.id];
        if (fieldInfo != null) {
            fieldInfo.field = field;

            // Clear down cached text value. We only calculate it on render in case this update is never
            // actually rendered.
            fieldInfo.textValue = null;
        }
    }

    private async createFieldInfo(field: Field) {
        // Function to get trending this field (if any) from its value.
        const getTrendHelper = getTrendHelperFromString(field.id, fieldIdTrends[field.id] || "tick");

        // Add field now before potentially waiting for additional metadata.
        const fieldInfo: FieldInfo = {
            name: "",
            tooltip: "",
            isVisible: false,
            field,
            textValue: null,
            render: () => {
                // Figure out trending for TRationals. Note not using lit-element's styleMap() as it's
                // quite slow. Just set some additional classes as required.
                let trendClass = "";
                if (fieldInfo.field.type === FieldType.tRational) {
                    switch (getTrendHelper(field.value as TRational)) {
                        case Trend.up:
                            trendClass = "record-viewer-trend record-viewer-trend-up";
                            break;

                        case Trend.down:
                            trendClass = "record-viewer-trend record-viewer-trend-down";
                            break;

                        default:
                            // Just padding to keep alignment when arrows appear/disappear.
                            trendClass = "record-viewer-trend";
                            break;
                    }
                }

                if (fieldInfo.textValue == null) {
                    // Calculate text value to render once until we receive a new value for the field.
                    fieldInfo.textValue = formatField(fieldInfo.field);
                }

                return html`
                    <div class="record-viewer-field-value ${trendClass}" title=${fieldInfo.textValue}>
                        ${fieldInfo.textValue}
                    </div>
                `;
            }
        };

        this.fields[field.id] = fieldInfo;

        let fieldHelper = this.client!.metaData.getUniversalFieldHelper(field.id);
        if (fieldHelper instanceof Promise) {
            fieldHelper = await fieldHelper;

            // this.fields isn't monitored, so request a redraw in case it's a while before
            // we receive something that would trigger one (e.g. out of hours; no updates).
            this.requestUpdate();
        }

        fieldInfo.name = fieldHelper.name;
        fieldInfo.tooltip = `${FieldId[field.id] || ""} (${field.id})\n${fieldHelper.description}`;
        fieldInfo.isVisible = this.isFieldVisible(fieldHelper.name);
    }

    private isFieldVisible(fieldName: string) {
        return fieldName.toLowerCase().includes(this.filterValue.toLowerCase());
    }

    private readonly handleFilterEvent = (e: Event) => {
        e.preventDefault();

        this.filterValue = e.target != null ? (e.target as HTMLInputElement).value : "";

        for (const fieldInfo of this.fields) {
            if (fieldInfo != null) {
                fieldInfo.isVisible = this.isFieldVisible(fieldInfo.name);
            }
        }

        // NB this.filterValue is registered as a property so we'll get a re-render scheduled.
    };

    private setStatus(message: string | null) {
        this.statusMessage = message;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

export { Attributes };
export default RecordViewer;
