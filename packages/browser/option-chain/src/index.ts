/*
 * OptionChain custom element.
 */

import { IExample, IExampleStats, ExampleStats } from "@activfinancial/cg-api";
import {
    IClient,
    IField,
    IFieldData,
    FieldId,
    FieldType,
    getExchangeCode,
    RelationshipId,
    StatusCode,
    Streaming,
    SymbolSeparator,
    Trend,
    TRational
} from "@activfinancial/cg-api";

import { getTrendHelperFromElement, applyTrendStyle, clearTrendStyle } from "../../common/trendingHelpers";
import { addUnloadHandler } from "../../../common/utils";
import { formatField, FormatFieldOptions, NumberFormat } from "../../../common/formatField";

// Note leading ! overrides webpack config matching css files.
import commonCss from "!raw-loader!../../common/common.css";
import indexCss from "!raw-loader!../style/index.css";

import indexHtml from "!raw-loader!./index.html";
import optionRowHtml from "!raw-loader!./optionRow.html";
import expirationSectionHtml from "!raw-loader!./expirationSection.html";

import { LitElement, customElement, property, PropertyValues } from "lit-element";

import { ResizeObserver } from "resize-observer";

import { detect as detectBrowser } from "detect-browser";

// ---------------------------------------------------------------------------------------------------------------------------------

interface FieldInfo extends FormatFieldOptions {
    element: HTMLElement;
    getTrend: (value: TRational) => Trend;
}

type UnderlyingFieldInfo = { [key in FieldId]?: FieldInfo };

interface OptionRow {
    strikePrice: number;
    root: string; // For ordering.
    exchangeCode: string; // For ordering.
    element: HTMLElement;

    updateCallOption: (image: Streaming.IRecord) => void;
    updatePutOption: (image: Streaming.IRecord) => void;
    updateInTheMoney: (previousUnderlyingPrice: number | null, underlyingPrice: number) => void;
}

interface ExpirationSection {
    expirationDate: Date;
    element: HTMLElement;
    headerElement: HTMLElement;
    optionRowsElement: HTMLElement;
    optionRows: OptionRow[];
}

type OptionChainData = ExpirationSection[];

// ---------------------------------------------------------------------------------------------------------------------------------

const dateFormat = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
});

const percentFormat = {
    format: (value: number) => `${value}%`
};

// ---------------------------------------------------------------------------------------------------------------------------------

const isEdge = (function() {
    const browserInfo = detectBrowser();
    return browserInfo != null && browserInfo.name === "edge";
})();

// ---------------------------------------------------------------------------------------------------------------------------------

// TODO surely we can automagically generate this (or vice-versa) from the props static below? Too much repetition.
/** Attributes interface. */
interface Attributes {
    symbol: string;
    "relationship-id": string;
    "conflation-type": "none" | keyof typeof Streaming.ConflationType;
    "conflation-interval": number;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * OptionChain class.
 */
@customElement("option-chain")
class OptionChain extends LitElement implements IExample {
    private readonly rootElement: HTMLDivElement;
    private readonly options: HTMLDivElement;
    private readonly status: HTMLDivElement;
    private readonly overlay: HTMLDivElement;
    private readonly resizeObserver = new ResizeObserver(() => this.processResize(this.rootElement));

    private clientPromise: Promise<IClient> | null = null;
    private client: IClient | null = null;
    private requestHandle: Streaming.IRequestHandle | null = null;
    private optionChainData: OptionChainData = [];
    private underlyingPrice: number = 0;
    private shouldExpandEarliestExpiration: boolean = true;
    private isNbbo: boolean = false;

    private currencyFormat?: NumberFormat;
    private priceFormat?: NumberFormat;

    private readonly underlyingFieldInfo: UnderlyingFieldInfo = {};
    private readonly underlyingFieldIds: FieldId[];
    private readonly optionFieldIds: FieldId[];

    private stats = new ExampleStats();

    // props.
    @property()
    symbol: string = "";

    @property({ attribute: "relationship-id" })
    relationshipId: string = "nbboOption";

    @property({ attribute: "conflation-type" })
    conflationType: string = "none";
    @property({ attribute: "conflation-interval", type: Number })
    conflationInterval: number = 500;

    constructor() {
        super();

        this.rootElement = document.createElement("div");
        this.rootElement.className = "activ-cg-api-webcomponent option-chain";
        this.rootElement.innerHTML = `<style>${commonCss}${indexCss}</style>${indexHtml}`;
        (this.renderRoot as HTMLElement).appendChild(this.rootElement);

        // Watch for resizes so we can add/remove columns.
        this.resizeObserver.observe(this.rootElement);

        this.options = this.rootElement.querySelector(".option-chain-options") as HTMLDivElement;
        this.status = this.rootElement.querySelector(".option-chain-status") as HTMLDivElement;
        this.overlay = this.rootElement.querySelector(".option-chain-overlay") as HTMLDivElement;

        // Find all elements mapping to field ids in the underlying header and cache them.
        const underlyingFieldIds: FieldId[] = [FieldId.FID_CLOSE, FieldId.FID_CURRENCY];

        for (const node of Array.from(this.rootElement.querySelectorAll(".option-chain-underlying-header [data-activ-field-id]"))) {
            const element = node as HTMLElement;
            const fieldId = FieldId[node.getAttribute("data-activ-field-id") as keyof typeof FieldId];
            underlyingFieldIds.push(fieldId);

            this.underlyingFieldInfo[fieldId] = {
                element,
                getTrend: getTrendHelperFromElement(fieldId, element)
            };
        }

        this.underlyingFieldIds = underlyingFieldIds;

        // Note close price is pointing at the same element as trade price.
        this.underlyingFieldInfo[FieldId.FID_CLOSE] = this.underlyingFieldInfo[FieldId.FID_TRADE];

        // Formatting for %change.
        this.underlyingFieldInfo[FieldId.FID_PERCENT_CHANGE]!.rationalNumberFormat = percentFormat;

        // Get list of field ids to request for options.
        const optionFieldIds: FieldId[] = [FieldId.FID_EXPIRATION_DATE, FieldId.FID_OPTION_TYPE];

        for (const optionElement of Array.from(
            this.rootElement.querySelectorAll(
                ".option-chain-call[data-activ-field-id], .option-chain-center-cells[data-activ-field-id]"
            )
        )) {
            const fieldId = FieldId[optionElement.getAttribute("data-activ-field-id") as keyof typeof FieldId];
            optionFieldIds.push(fieldId);
        }

        this.optionFieldIds = optionFieldIds;

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

        this.setStatus("Connected");

        // Tooltips for header fields.
        const headerFields = this.rootElement.querySelectorAll(
            ".option-chain-sub-header-cell[data-activ-field-id],.option-chain-underlying-header-cell[data-activ-field-id]"
        );
        for (const headerFieldElement of Array.from(headerFields)) {
            const fieldId = FieldId[headerFieldElement.getAttribute("data-activ-field-id") as keyof typeof FieldId];
            const universalFieldHelper = await this.client!.metaData.getUniversalFieldHelper(fieldId);
            if (universalFieldHelper != null) {
                (headerFieldElement as HTMLElement).title = universalFieldHelper.description;
            }
        }

        this.subscribe();

        try {
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
            changedProperties.has("relationshipId") ||
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

        if (this.client == null || this.symbol === "") {
            return;
        }

        this.stats = new ExampleStats();
        this.shouldExpandEarliestExpiration = true;
        this.setStatus("Subscribing...");

        // Only need to show exchange column for all regional options. NBBO is implicitly "O".
        // Call processResize() for an initial adjustment based on whether the exchange column is present.
        this.isNbbo = this.relationshipId.startsWith("nbbo");
        (this.rootElement.querySelector("#option-chain-sub-header-cell-exchange") as HTMLElement).style.display = this.isNbbo
            ? "none"
            : "";
        this.processResize(this.rootElement);

        try {
            const requestParameters: Streaming.IGetMatchParameters = {
                key: this.symbol,
                matchType: Streaming.GetMatchType.composite,
                shouldMatchExact: true,
                relationships: {
                    [RelationshipId.none]: {
                        fieldIds: this.underlyingFieldIds
                    },
                    [RelationshipId.company]: {
                        fieldIds: [FieldId.FID_NAME]
                    },
                    [this.relationshipId]: {
                        fieldIds: this.optionFieldIds
                    }
                },
                subscription: {
                    updateHandler: (update: Streaming.IUpdate) => {
                        if (update.relationshipId === RelationshipId[this.relationshipId as keyof typeof RelationshipId]) {
                            if (update.isNewRecord) {
                                this.processOption(update);
                            }
                        }
                    }
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

            this.shouldExpandEarliestExpiration = false;
            this.stats.renderingCompleteTimestamp = performance.now();
        } catch (e) {
            this.setStatus(`Error subscribing: ${e}`);
        }
    }

    private unsubscribe() {
        this.options.innerHTML = "";

        if (this.requestHandle != null) {
            this.requestHandle.delete();
            this.requestHandle = null;
        }

        this.optionChainData = [];
        this.underlyingPrice = 0;
    }

    private processRecord(record: Streaming.IImage) {
        switch (record.relationshipId) {
            case RelationshipId.none:
                this.processUnderlying(record);
                break;

            case RelationshipId.company:
                const name = record.getField(FieldId.FID_NAME);
                this.updateUnderlyingField(name);
                this.underlyingFieldInfo[FieldId.FID_NAME]!.element.setAttribute("title", name.value as string);
                break;

            case RelationshipId[this.relationshipId as keyof typeof RelationshipId]:
                if (record.statusCode === StatusCode.success) {
                    this.processOption(record);
                } else {
                    console.warn(`Dropping option ${record.responseKey.symbol} with status ${record.statusCode}`);
                }
                break;
        }
    }

    private processUnderlying(record: Streaming.IImage) {
        ++this.stats.responsesReturned;

        this.underlyingFieldInfo[FieldId.FID_SYMBOL]!.element.textContent = record.responseKey.symbol;

        this.client!.metaData.getExchangeInfo(record.responseKey.symbol).then((exchangeInfo) => {
            this.underlyingFieldInfo[FieldId.FID_EXCHANGE]!.element.textContent = exchangeInfo.name;
        });

        const currencyField = record.getField(FieldId.FID_CURRENCY);
        if (currencyField.value != null) {
            const currencyFormat = new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currencyField.value as string,
                // For sub-penny, etc., regardless of default for currency.
                maximumFractionDigits: 9
            });
            this.currencyFormat = currencyFormat;

            this.priceFormat = new Intl.NumberFormat(undefined, {
                // Not setting "style" here to avoid displaying currency symbol.
                // We'll only use currencyFormat in the underlying header to show currency info.
                currency: currencyField.value as string,
                // Without "style: currency", we don't get minimumFractionDigits so copy from currencyFormat.
                minimumFractionDigits: currencyFormat.resolvedOptions().minimumFractionDigits,
                // For sub-penny, etc., regardless of default for currency.
                maximumFractionDigits: 9
            });
        }

        // Use currencyFormat for the trade price in the underlying header. It will show the currency.
        for (const fieldId of [FieldId.FID_TRADE, FieldId.FID_CLOSE]) {
            const underlyingField = this.underlyingFieldInfo[fieldId];
            if (underlyingField != null) {
                underlyingField.rationalNumberFormat = this.currencyFormat;
            }
        }

        this.requestHandle!.setUpdateHandler(record.streamId, (update: Streaming.IUpdate) => {
            ++this.stats.totalUpdates;

            const previousUnderlyingPrice = this.underlyingPrice;

            this.updateUnderlying(update.fieldData);

            if (previousUnderlyingPrice != this.underlyingPrice) {
                this.updateInTheMoneyOptions(previousUnderlyingPrice);
            }
        });

        this.updateUnderlying(record.fieldData);

        // Special case if closed; updateUnderlying() ignores FID_CLOSE.
        if (this.underlyingPrice === 0) {
            const field = record.getField(FieldId.FID_CLOSE);
            if (field.value != null) {
                this.underlyingPrice = (field.value as TRational).valueOf();
                this.updateUnderlyingField(field);

                // On the off chance options arrived before the underlying:
                this.updateInTheMoneyOptions(0);
            }
        }
    }

    private updateUnderlying(fieldData: IFieldData) {
        for (const field of fieldData) {
            if (!field.doesUpdateLastValue) {
                continue;
            }

            switch (field.id) {
                case FieldId.FID_TRADE:
                    if (field.value != null) {
                        this.underlyingPrice = (field.value as TRational).valueOf();
                        this.updateUnderlyingField(field);
                    }
                    break;

                case FieldId.FID_CLOSE:
                    // Ignore FID_CLOSE; we'll only use it on initial load if out of hours and FID_TRADE isn't defined.
                    break;

                default:
                    this.updateUnderlyingField(field);
                    break;
            }
        }
    }

    private updateUnderlyingField(field: IField) {
        const fieldInfo = this.underlyingFieldInfo[field.id];
        if (fieldInfo != null) {
            if (field.type === FieldType.tRational) {
                applyTrendStyle(fieldInfo.getTrend(field.value as TRational), fieldInfo.element);
            } else if (field.value == null) {
                clearTrendStyle(fieldInfo.element);
            }

            fieldInfo.element.textContent = formatField(field, fieldInfo);
        }
    }

    private processOption(record: Streaming.IRecord) {
        ++this.stats.responsesReturned;

        const optionType = record.getField(FieldId.FID_OPTION_TYPE);
        const isCall = optionType.value === "C";
        if (!isCall && optionType.value !== "P") {
            console.warn(`Dropping option ${record.responseKey.symbol} with unknown option type ${optionType.value}`);
            return;
        }

        const expirationDateField = record.getField(FieldId.FID_EXPIRATION_DATE);
        if (expirationDateField.value == null) {
            console.warn(`Dropping option ${record.responseKey.symbol} with undefined expiration date`);
            return;
        }

        // TODO does C++ cope with undefined?
        const strikePriceField = record.getField(FieldId.FID_STRIKE_PRICE);
        if (strikePriceField.value == null) {
            console.warn(`Dropping option ${record.responseKey.symbol} with undefined strike price`);
            return;
        }

        const expirationSection = this.createOrFindExpirySection(expirationDateField.value as Date);
        const optionRow = this.createOrFindOptionRow(record.responseKey.symbol, expirationSection, strikePriceField);
        const updateOption = isCall ? optionRow.updateCallOption : optionRow.updatePutOption;

        // Set tooltip to symbol.
        for (const node of Array.from(
            expirationSection.element.querySelectorAll(`.${OptionChain.getSideClass(isCall)}[data-activ-field-id]`)
        )) {
            const element = node as HTMLElement;

            // Tooltip for the symbol.
            element.title = record.responseKey.symbol;
        }

        updateOption(record);
        optionRow.updateInTheMoney(null, this.underlyingPrice);

        this.requestHandle!.setUpdateHandler(record.streamId, (update: Streaming.IUpdate) => {
            ++this.stats.totalUpdates;

            if (!update.isDelete) {
                updateOption(update);
            } else {
                this.deleteOption(expirationSection, optionRow);
            }
        });
    }

    private createOrFindExpirySection(expirationDate: Date): ExpirationSection {
        const index = this.optionChainData.findIndex((section) => section.expirationDate >= expirationDate);
        if (index !== -1) {
            const expirationSection = this.optionChainData[index];
            if (expirationSection.expirationDate.valueOf() === expirationDate.valueOf()) {
                return expirationSection;
            }
        }

        const expirationSection = this.createExpirySection(expirationDate);

        if (this.shouldExpandEarliestExpiration) {
            // If we're loading the page, keep the top expiry section expanded and the others collapsed.
            if (this.optionChainData.length === 0 || index === 0) {
                // Whilst loading, only keep the earliest expiry section expanded.
                for (const expirationSection of this.optionChainData) {
                    this.toggleExpirationSection(expirationSection, false);
                }

                this.toggleExpirationSection(expirationSection, true);
            }
        }

        if (index === -1) {
            this.options.appendChild(expirationSection.element);
            this.optionChainData.push(expirationSection);
        } else {
            this.options.insertBefore(expirationSection.element, this.optionChainData[index].element);
            this.optionChainData.splice(index, 0, expirationSection);
        }

        return expirationSection;
    }

    private createOrFindOptionRow(symbol: string, expirationSection: ExpirationSection, strikePriceField: IField): OptionRow {
        // Key for an option in an expiry date section is strike+root+exchange.
        const root = symbol.slice(0, symbol.indexOf(SymbolSeparator.expirationDateSeparator));
        const exchangeCode = getExchangeCode(symbol);
        const strikePrice = strikePriceField.value as number;

        const index = expirationSection.optionRows.findIndex((row) => {
            if (row.strikePrice > strikePrice) {
                return true;
            } else if (row.strikePrice < strikePrice) {
                return false;
            }

            if (row.root > root) {
                return true;
            } else if (row.root < root) {
                return false;
            }

            return row.exchangeCode >= exchangeCode;
        });

        if (index !== -1) {
            const existingRow = expirationSection.optionRows[index];

            if (
                existingRow.strikePrice.valueOf() === strikePrice.valueOf() &&
                existingRow.root === root &&
                existingRow.exchangeCode === exchangeCode
            ) {
                return existingRow;
            }
        }

        const row = this.createOptionRow(symbol, strikePriceField, root, exchangeCode);

        if (index === -1) {
            expirationSection.optionRowsElement.appendChild(row.element);
            expirationSection.optionRows.push(row);
        } else {
            expirationSection.optionRowsElement.insertBefore(row.element, expirationSection.optionRows[index].element);
            expirationSection.optionRows.splice(index, 0, row);
        }

        if (this.shouldExpandEarliestExpiration && !isEdge) {
            // On initial load, scroll to the at-the-money options. scrollIntoView() causes issues with Edge.
            OptionChain.scrollToAtTheMoney(expirationSection);
        }

        return row;
    }

    private createExpirySection(expirationDate: Date): ExpirationSection {
        // Main expiry div contains the header row (with the date, that is clickable)
        // and a div containing all the option divs themselves.
        const element = document.createElement("div");
        element.className = "option-chain-expiry-section";
        element.innerHTML = expirationSectionHtml;

        const headerElement = element.querySelector(".option-chain-expiry-row") as HTMLElement;
        headerElement.textContent = dateFormat.format(expirationDate);

        const optionRowsElement = document.createElement("div");
        optionRowsElement.className = "option-chain-option-rows";

        const expirationSection = { expirationDate, element, headerElement, optionRowsElement, optionRows: [] };

        // Clicking the expiry header toggles display of its options.
        headerElement.addEventListener("click", () => {
            // Disable auto-toggling of sections after a manual click (only used on initial load anyway).
            this.shouldExpandEarliestExpiration = false;

            this.toggleExpirationSection(expirationSection);
        });

        return expirationSection;
    }

    private toggleExpirationSection(expirationSection: ExpirationSection, show?: boolean) {
        const expandedClass = "option-chain-expiry-row-expanded";
        const isExpanded = expirationSection.element.contains(expirationSection.optionRowsElement);

        if (show == null || show !== isExpanded) {
            if (isExpanded) {
                expirationSection.element.removeChild(expirationSection.optionRowsElement);
                expirationSection.headerElement.classList.remove(expandedClass);
            } else {
                expirationSection.element.appendChild(expirationSection.optionRowsElement);
                expirationSection.headerElement.classList.add(expandedClass);

                OptionChain.scrollToAtTheMoney(expirationSection);
            }
        }
    }

    private static scrollToAtTheMoney(expirationSection: ExpirationSection) {
        // Scroll first above the money in to view.
        const aboveTheMoneyRow = expirationSection.optionRowsElement.querySelector(".option-chain-above-the-money");
        if (aboveTheMoneyRow != null) {
            aboveTheMoneyRow.scrollIntoView({ block: "center" });
        }
    }

    private createOptionRow(symbol: string, strikePriceField: IField, root: string, exchangeCode: string): OptionRow {
        const rowElement = document.createElement("div");
        rowElement.className = "option-chain-option-row";
        rowElement.innerHTML = optionRowHtml;

        const strikePrice = strikePriceField.value as number;
        const strikePriceCell = rowElement.querySelector(`[data-activ-field-id="FID_STRIKE_PRICE"]`) as HTMLDivElement;
        strikePriceCell.textContent = formatField(strikePriceField, { rationalNumberFormat: this.priceFormat });

        const exchangeCodeCell = rowElement.querySelector(`[data-activ-field-id="FID_EXCHANGE"]`) as HTMLDivElement;
        exchangeCodeCell.textContent = exchangeCode;
        exchangeCodeCell.style.display = this.isNbbo ? "none" : "";
        this.client!.metaData.getExchangeInfo(exchangeCode).then((exchangeInfo) => {
            exchangeCodeCell.title = exchangeInfo.name;
        });

        let callFieldInfos: FieldInfo[] = [];
        let putFieldInfos: FieldInfo[] = [];

        const buildSide = (isCall: boolean) => {
            const fieldInfos = isCall ? callFieldInfos : putFieldInfos;

            for (const node of Array.from(
                rowElement.querySelectorAll(`.${OptionChain.getSideClass(isCall)}[data-activ-field-id]`)
            )) {
                const element = node as HTMLElement;
                const fieldId = FieldId[node.getAttribute("data-activ-field-id") as keyof typeof FieldId];

                fieldInfos[fieldId] = {
                    element,
                    // Use priceFormat if a price field.
                    rationalNumberFormat: node.classList.contains("option-chain-price-field") ? this.priceFormat : undefined,
                    getTrend: getTrendHelperFromElement(fieldId, element)
                };
            }
        };

        buildSide(true);
        buildSide(false);

        // Initial sizing of row.
        this.processResize(rowElement);

        function makeUpdateOption(fieldInfos: FieldInfo[]) {
            return function(image: Streaming.IRecord) {
                for (const field of image.fieldData) {
                    if (!field.doesUpdateLastValue) {
                        continue;
                    }

                    // TODO closing.
                    const fieldInfo = fieldInfos[field.id];

                    if (fieldInfo != null) {
                        if (field.type === FieldType.tRational) {
                            applyTrendStyle(fieldInfo.getTrend(field.value as TRational), fieldInfo.element);
                        } else if (field.value == null) {
                            clearTrendStyle(fieldInfo.element);
                        }

                        fieldInfo.element.textContent = formatField(field, fieldInfo);
                    }
                }
            };
        }

        function updateInTheMoney(previousUnderlyingPrice: number | null, underlyingPrice: number) {
            if ((previousUnderlyingPrice == null || strikePrice <= previousUnderlyingPrice) && strikePrice > underlyingPrice) {
                rowElement.classList.add("option-chain-above-the-money");
                rowElement.classList.remove("option-chain-below-the-money");
            } else if (
                (previousUnderlyingPrice == null || strikePrice >= previousUnderlyingPrice) &&
                strikePrice < underlyingPrice
            ) {
                rowElement.classList.remove("option-chain-above-the-money");
                rowElement.classList.add("option-chain-below-the-money");
            }
        }

        return {
            strikePrice,
            root,
            exchangeCode,
            element: rowElement,
            updateCallOption: makeUpdateOption(callFieldInfos),
            updatePutOption: makeUpdateOption(putFieldInfos),
            updateInTheMoney
        };
    }

    private deleteOption(expirationSection: ExpirationSection, optionRow: OptionRow) {
        const optionIndex = expirationSection.optionRows.indexOf(optionRow);
        if (optionIndex === -1) {
            return;
        }

        expirationSection.optionRowsElement.removeChild(optionRow.element);
        expirationSection.optionRows.splice(optionIndex, 1);

        // Whole expiration might now be empty.
        if (expirationSection.optionRows.length > 0) {
            return;
        }

        const expirationIndex = this.optionChainData.indexOf(expirationSection);
        if (expirationIndex === -1) {
            return;
        }

        this.options.removeChild(expirationSection.element);
        this.optionChainData.splice(expirationIndex, 1);

        // Note we're deleting the entire row when the put or call is deleted; updates to the other side will
        // be ignored. Both should be deleted at the same time, anyway.
    }

    private updateInTheMoneyOptions(previousUnderlyingPrice: number) {
        for (const section of this.optionChainData) {
            for (const row of section.optionRows) {
                row.updateInTheMoney(previousUnderlyingPrice, this.underlyingPrice);
            }
        }
    }

    private setStatus(message: string | null) {
        this.status.textContent = message;
        this.overlay.style.display = message == null ? "none" : "";
    }

    /**
     * Size the elements in the option display based on our container size.
     *
     * Note we're not using `@media` max-width CSS rules as we want to be dependent on the size of the
     * WebComponent rather than the display.
     *
     * @param parentNode - parent node of elements to size. this.rootElement for whole document (on resize) or
     *        an option row for initial draw of that row.
     */
    private processResize(parentNode: ParentNode) {
        // TODO it would be nice to bin the column width calc. flexbox almost works, but dynamically adding
        // padding to elements based on trending (for arrows) causes columns to misalign. I'm sure there's a solution...

        const smallWidth = 540;
        const mediumWidth = 900;
        const currentWidth = this.rootElement.clientWidth;

        // Get the 3 sets of cells for styling.
        const allCells = Array.from(parentNode.querySelectorAll(".option-chain-sub-header-cell, .option-chain-option-cell"));
        const mediumCells = Array.from(parentNode.querySelectorAll(".option-chain-medium"));
        const smallCells = Array.from(parentNode.querySelectorAll(".option-chain-small"));

        // Use the header row to get the number of columns for the 3 size cases.
        const optionsSubHeader = this.rootElement.querySelector(".option-chain-sub-header-row") as HTMLElement;
        const allColumnsCount = optionsSubHeader.querySelectorAll(".option-chain-sub-header-cell").length - (this.isNbbo ? 1 : 0);
        const mediumColumnsCount = allColumnsCount - optionsSubHeader.querySelectorAll(".option-chain-medium").length;
        const smallColumnsCount = mediumColumnsCount - optionsSubHeader.querySelectorAll(".option-chain-small").length;

        function handleColumnCount(columnCount: number) {
            const width = `calc((100% - (${columnCount} - 1) * 0.1%) / ${columnCount})`;

            for (const cell of allCells) {
                (cell as HTMLElement).style.width = width;
            }

            const isSmallHidden = columnCount <= smallColumnsCount;
            const isMediumHidden = columnCount <= mediumColumnsCount;

            for (const cell of mediumCells) {
                (cell as HTMLElement).style.display = isMediumHidden ? "none" : "";
            }

            for (const cell of smallCells) {
                (cell as HTMLElement).style.display = isSmallHidden ? "none" : "";
            }
        }

        if (currentWidth < smallWidth) {
            handleColumnCount(smallColumnsCount);
        } else if (currentWidth < mediumWidth) {
            handleColumnCount(mediumColumnsCount);
        } else {
            handleColumnCount(allColumnsCount);
        }
    }

    private static getSideClass(isCall: boolean) {
        return `option-chain-${isCall ? "call" : "put"}`;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

export { Attributes };
export default OptionChain;
