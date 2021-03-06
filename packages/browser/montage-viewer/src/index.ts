/*
 * MontageViewer custom element.
 */

import {
    addUnloadHandler,
    IClient,
    Streaming,
    FieldType,
    StatusCode,
    TRational,
    TableNumber,
    TrendType
} from "@activfinancial/cg-api";
import {
    formatField,
    getTrendHelperFromString,
    IExample,
    IExampleStats,
    ExampleStats
} from "@activfinancial/cg-api-examples-common";

import { FieldInfo, tableInfos } from "./tableFields";

import { applyTrendStyle, clearTrendStyle } from "../../common/trendingHelpers";

// Note leading ! overrides webpack config matching css files.
import commonCss from "!raw-loader!../../common/common.css";
import indexCss from "!raw-loader!../style/index.css";

import indexHtml from "!raw-loader!./index.html";

import { LitElement, customElement, property, PropertyValues } from "lit-element";

// ---------------------------------------------------------------------------------------------------------------------------------

// TODO can we factor out the attribute names below? Too much repetition.
/** Attributes interface. */
interface Attributes {
    "symbol-list": string;
    "table-number": string;
    "conflation-type": "none" | keyof typeof Streaming.ConflationType;
    "conflation-interval": number;
}

// ---------------------------------------------------------------------------------------------------------------------------------

@customElement("montage-viewer")
class MontageViewer extends LitElement implements IExample {
    private readonly rootElement: HTMLDivElement;
    private readonly header: HTMLTableElement;
    private readonly body: HTMLTableElement;
    private readonly status: HTMLDivElement;
    private readonly overlay: HTMLDivElement;

    private clientPromise: Promise<IClient> | null = null;
    private client: IClient | null = null;
    private requestHandle: Streaming.IRequestHandle | null = null;
    private fieldInfos: FieldInfo[] = [];
    private stats = new ExampleStats();

    // props.
    @property({ attribute: "symbol-list" })
    symbolList: string = "";

    @property({ attribute: "table-number" })
    tableNumber: string | null = null;

    @property({ attribute: "conflation-type" })
    conflationType: "none" | keyof typeof Streaming.ConflationType = "none";

    @property({ attribute: "conflation-interval", type: Number })
    conflationInterval: number = 500;

    constructor() {
        super();

        this.rootElement = document.createElement("div");
        this.rootElement.className = "activ-cg-api-webcomponent montage-viewer";
        this.rootElement.innerHTML = `<style>${commonCss}${indexCss}</style>${indexHtml}`;
        (this.renderRoot as HTMLElement).appendChild(this.rootElement);

        this.header = this.rootElement.querySelector(".montage-viewer-header-thead") as HTMLTableElement;
        this.body = this.rootElement.querySelector(".montage-viewer-table-body") as HTMLTableElement;
        this.status = this.rootElement.querySelector(".montage-viewer-status") as HTMLDivElement;
        this.overlay = this.rootElement.querySelector(".montage-viewer-overlay") as HTMLDivElement;

        addUnloadHandler(() => this.unsubscribe());

        this.setStatus("Waiting...");
    }

    async connect(clientPromise: Promise<IClient>) {
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

            // Pre-load field info from server for a smoother experience.
            this.client.metaData.getUniversalFieldHelperList();

            this.subscribe();

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
            changedProperties.has("symbolList") ||
            changedProperties.has("tableNumber") ||
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

    private async subscribe() {
        this.unsubscribe();

        if (this.client == null || this.symbolList === "" || this.tableNumber == null) {
            return;
        }

        this.stats = new ExampleStats();
        this.setStatus("Subscribing...");

        try {
            const tableNumber = MontageViewer.getTableNumber(this.tableNumber);
            if (tableNumber == TableNumber.undefined) {
                throw new Error(`Unknown table ${this.tableNumber}`);
            }

            const fieldInfos = tableInfos[this.tableNumber];
            this.fieldInfos = fieldInfos != null ? fieldInfos : tableInfos.default;

            // ";" delimited list of patterns provided. Split up and create a SymbolIdList.
            const symbolIdList = this.symbolList.split(";").map((pattern) => {
                return { tableNumber, symbol: pattern };
            });

            const requestParameters: Streaming.IGetPatternParameters = {
                key: symbolIdList,
                fieldIds: this.fieldInfos.map((fieldInfo: FieldInfo) => fieldInfo.fieldId),
                subscription: {
                    // Note no update handler; record specific handler set on receipt of response.
                }
            };

            if (this.conflationType !== "none") {
                requestParameters.subscription!.conflation = {
                    type: Streaming.ConflationType[this.conflationType],
                    interval: this.conflationInterval
                };
            }

            // Initiate the async request.
            this.requestHandle = this.client.streaming.getPattern(requestParameters);

            this.createHeaderRow();

            // Asynchronously iterate all records resulting from the request.
            for await (const record of this.requestHandle) {
                if (0 === this.stats.responsesReturned) {
                    this.setStatus(null);
                    this.stats.initialResponseTimestamp = performance.now();
                }

                this.processRecord(record);
            }

            if (0 == this.stats.responsesReturned) {
                this.setStatus("No records found");
            }

            this.stats.renderingCompleteTimestamp = performance.now();
        } catch (e) {
            this.setStatus(`Error subscribing: ${e}`);
        }
    }

    private unsubscribe() {
        this.body.innerHTML = "";

        if (this.requestHandle != null) {
            this.requestHandle.delete();
            this.requestHandle = null;
        }
    }

    private processRecord(record: Streaming.IImage) {
        ++this.stats.responsesReturned;

        if (record.statusCode !== StatusCode.success) {
            console.warn(`Dropping ${record.responseKey.symbol} with status ${StatusCode[record.statusCode]}`);
            return;
        }

        const updateRow = this.createRow();

        this.requestHandle!.setUpdateHandler(record.streamId, (update: Streaming.IUpdate) => {
            ++this.stats.totalUpdates;
            updateRow(update);
        });

        updateRow(record);
    }

    private async createHeaderRow() {
        this.header.innerHTML = "";
        const headerRow = this.header.insertRow(0);
        headerRow.className = "montage-viewer-header-row";
        const width = 100 / this.fieldInfos.length;

        for (const fieldInfo of this.fieldInfos) {
            // Default trending if not specified.
            if (fieldInfo.trendHelper == null) {
                fieldInfo.trendHelper = getTrendHelperFromString(fieldInfo.fieldId, TrendType[TrendType.tick]);
            }

            const cell = document.createElement("th");

            // Not bothered about optimizing away the await; this is just called on initialization, not
            // per per field in an update, for example.
            const universalFieldHelper = await this.client!.metaData.getUniversalFieldHelper(fieldInfo.fieldId);
            if (universalFieldHelper != null) {
                cell.textContent = universalFieldHelper.name;
                cell.title = universalFieldHelper.description;
            } else {
                cell.textContent = `FieldId${fieldInfo.fieldId}`;
            }

            cell.style.width = `${width}%`;
            cell.className = "montage-viewer-header-cell";

            headerRow.appendChild(cell);
        }
    }

    private createRow() {
        const element = document.createElement("tr");
        element.className = "montage-viewer-row";

        const width = 100 / this.fieldInfos.length;
        let fieldIdToIndex: number[] = [];

        for (let i = 0; i < this.fieldInfos.length; i++) {
            const cell = document.createElement("td");
            cell.style.width = `${width}%`;
            cell.className = "montage-viewer-row-cell";
            element.appendChild(cell);
            fieldIdToIndex[this.fieldInfos[i].fieldId] = i;
        }

        const updateRow = (record: Streaming.IRecord) => {
            for (const field of record.fieldData) {
                const index = fieldIdToIndex[field.id];

                if (index != null && field.doesUpdateLastValue) {
                    const cell = element.children[index] as HTMLTableCellElement;
                    cell.textContent = formatField(field);

                    if (field.type === FieldType.tRational) {
                        applyTrendStyle(this.fieldInfos[index].trendHelper!(field.value as TRational), cell);
                    } else if (field.value == null) {
                        clearTrendStyle(cell);
                    }
                }
            }
        };

        this.body.appendChild(element);

        return updateRow;
    }

    private setStatus(message: string | null) {
        this.status.textContent = message;
        this.overlay.style.display = message == null ? "none" : "";
    }

    private static getTableNumber(tableNumberStr: string): TableNumber {
        let tableNumber = parseInt(tableNumberStr);

        if (isNaN(tableNumber)) {
            tableNumber = TableNumber[tableNumberStr as keyof typeof TableNumber];
            if (tableNumber == null) {
                tableNumber = TableNumber.undefined;
            }
        }

        return tableNumber;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

export { Attributes };
export default MontageViewer;
