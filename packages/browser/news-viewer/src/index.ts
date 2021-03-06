/*
 * News viewer custom element.
 */

import { addUnloadHandler, IClient, IField, FieldId, News } from "@activfinancial/cg-api";
import { formatField, IExample, IExampleStats, ExampleStats } from "@activfinancial/cg-api-examples-common";

// Note leading ! overrides webpack config matching css files.
import commonCss from "!raw-loader!../../common/common.css";
import indexCss from "!raw-loader!../style/index.css";

import indexHtml from "!html-loader!./index.html";
import headlineHtml from "!html-loader!./headlineRow.html";

// HACK sort this out properly. Can't get a WebComponent importing fontawesome like cg-api-explorer.
import angleLeft from "!url-loader!@fortawesome/fontawesome-free/svgs/solid/angle-left.svg";
import angleRight from "!url-loader!@fortawesome/fontawesome-free/svgs/solid/angle-right.svg";

import comtexLogo from "!url-loader!../img/comtex-logo.png";

import { LitElement, customElement, property, PropertyValues } from "lit-element";

// TODO just using the polyfill everywhere isn't working in Openfin.
import { TextDecoder as TextDecoderPF } from "text-encoding";

import { detect as detectBrowser } from "detect-browser";

// ---------------------------------------------------------------------------------------------------------------------------------

// TODO surely we can automagically generate this (or vice-versa) from the props static below? Too much repetition.
/** Attributes interface. */
interface Attributes {
    query: string;
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Map of encoding -> TextDecoder.
interface TextDecoders {
    [key: string]: TextDecoder;
}

let textDecoders: TextDecoders = {};

const fallbackEncoding = "utf-8";

function getTextDecoder(encoding: string) {
    const normalizedEncoding = encoding.toLowerCase();

    if (textDecoders[normalizedEncoding] != null) {
        return textDecoders[normalizedEncoding];
    }

    let textDecoder;

    function makeTextDecoder(encoding: string) {
        // TODO just using the polyfill isn't working in Openfin, so runtime check here.
        return typeof TextDecoder === "undefined" ? new TextDecoderPF(encoding) : new TextDecoder(encoding);
    }

    try {
        textDecoder = makeTextDecoder(normalizedEncoding);
    } catch (e) {
        // Fallback to utf-8 for anything that fails.
        console.error(e);
        textDecoder = makeTextDecoder(fallbackEncoding);
    }

    textDecoders[normalizedEncoding] = textDecoder;
    return textDecoder;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * NewsViewer WebComponent.
 */
@customElement("news-viewer")
class NewsViewer extends LitElement implements IExample {
    private readonly rootElement: HTMLDivElement;
    private readonly status: HTMLDivElement;
    private readonly overlay: HTMLDivElement;
    private readonly headlineTable: HTMLTableElement;
    private readonly articleContainerElement: HTMLDivElement;
    private readonly articleElement: HTMLElement;
    private readonly storyBodyHeadlineElement: HTMLElement;
    private readonly storySymbolElement: HTMLElement;
    private readonly previousStoryButton: HTMLButtonElement;
    private readonly nextStoryButton: HTMLButtonElement;
    private readonly storyBodyElement: HTMLDivElement;

    private clientPromise: Promise<IClient> | null = null;
    private client: IClient | null = null;
    private headlineRequestHandle: News.IRequestHandle | null = null;
    private bodyRequestHandle: News.IRequestHandle | null = null;

    private readonly storyBodyParser = new DOMParser();

    private nextStorySymbol: string | null = null;
    private previousStorySymbol: string | null = null;

    private readonly dateFormat = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    private readonly timeFormat = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });

    private stats = new ExampleStats();

    // props.
    @property()
    query: string = "";

    constructor() {
        super();

        this.rootElement = document.createElement("div");
        this.rootElement.className = "activ-cg-api-webcomponent news-viewer";
        this.rootElement.innerHTML = `<style>${commonCss}${indexCss}</style>${indexHtml}`;

        // HACK setting height in the CSS breaks Edge (see index.css).
        const browserInfo = detectBrowser();
        if (browserInfo != null && browserInfo.name === "edge") {
            this.rootElement.style.height = "100%";
        }

        (this.renderRoot as HTMLElement).appendChild(this.rootElement);

        this.status = this.rootElement.querySelector(".news-viewer-status") as HTMLDivElement;
        this.overlay = this.rootElement.querySelector(".news-viewer-overlay") as HTMLDivElement;

        // HACK bug in OpenFin 9 causes sticky header to go wonky (scroll down at least a page, select a row -> header moves).
        // TODO surely a better solution...
        if (navigator.userAgent.indexOf("OpenFin/9.") === -1) {
            for (const element of Array.from(this.rootElement.querySelectorAll(".news-viewer-headline-table th"))) {
                element.classList.add("news-viewer-headline-table-header-sticky");
            }
        }

        this.headlineTable = this.rootElement.querySelector(".news-viewer-headline-table>tbody") as HTMLTableElement;

        this.articleContainerElement = this.rootElement.querySelector(".news-viewer-article-container") as HTMLDivElement;
        this.articleElement = this.rootElement.querySelector("article") as HTMLElement;
        this.storyBodyHeadlineElement = this.rootElement.querySelector(".news-story-body-headline") as HTMLElement;
        this.storySymbolElement = this.rootElement.querySelector(".news-story-symbol") as HTMLElement;
        this.storyBodyElement = this.rootElement.querySelector(".news-story-body-display") as HTMLDivElement;

        this.previousStoryButton = this.rootElement.querySelector(".news-viewer-previous-story") as HTMLButtonElement;
        this.previousStoryButton.addEventListener("click", () => {
            if (this.previousStorySymbol != null) {
                this.getStoryBody(this.previousStorySymbol);
            }
        });

        this.nextStoryButton = this.rootElement.querySelector(".news-viewer-next-story") as HTMLButtonElement;
        this.nextStoryButton.addEventListener("click", () => {
            if (this.nextStorySymbol != null) {
                this.getStoryBody(this.nextStorySymbol);
            }
        });

        this.previousStoryButton.style.backgroundImage = `url('${angleLeft}')`;
        this.nextStoryButton.style.backgroundImage = `url('${angleRight}')`;

        const comtexLogoElement = this.rootElement.querySelector("#comtexLogo") as HTMLImageElement;
        comtexLogoElement.src = comtexLogo;

        addUnloadHandler(() => this.unsubscribe());

        this.setStatus("Waiting...");
    }

    async connect(connected: Promise<IClient>) {
        if (this.clientPromise === connected) {
            return;
        }

        this.clientPromise = connected;
        this.setStatus("Connecting...");

        try {
            this.client = await connected;
        } catch (e) {
            this.setStatus(`Error connecting: ${e}`);
            throw e;
        }

        this.setStatus("Connected");

        this.subscribe();

        try {
            await this.client.disconnected;
            this.setStatus("Disconnected");
        } catch (e) {
            this.setStatus(`Connection broken: ${e}`);
        } finally {
            this.client = null;
        }
    }

    shouldUpdate(changedProperties: PropertyValues) {
        // Check for properties that require a resubscribe if they change.
        // TODO automate this from the Attributes interface somehow...
        if (changedProperties.has("query")) {
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

        if (this.client == null || this.query === "") {
            return;
        }

        this.stats = new ExampleStats();
        this.setStatus("Subscribing...");

        try {
            const requestParameters = {
                query: this.query,
                updateHandler: (update: News.IUpdate) => this.processUpdate(update),
                fieldIds: [
                    FieldId.FID_HEADLINE,
                    FieldId.FID_MAGAZINE,
                    FieldId.FID_STORY_DATE_TIME,
                    FieldId.FID_PREVIOUS_NEWS_SYMBOL
                ],
                numberOfRecords: 100
            };

            // Initiate the async request.
            this.headlineRequestHandle = this.client.news.getStories(requestParameters);

            // Asynchronously iterate all records resulting from the request.
            for await (const record of this.headlineRequestHandle) {
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
        this.resetDisplay();
        this.previousStorySymbol = null;
        this.nextStorySymbol = null;

        if (this.headlineRequestHandle != null) {
            this.headlineRequestHandle.delete();
            this.headlineRequestHandle = null;
        }

        this.unsubscribeStoryBody();
    }

    private processRecord(record: News.IStory) {
        ++this.stats.responsesReturned;

        // Results are newest first, so append to the headline table.
        this.createHeadlineRow(record, true);
    }

    private processUpdate(update: News.IUpdate) {
        ++this.stats.totalUpdates;

        if (update.isNewRecord) {
            this.createHeadlineRow(update, false);
        }
    }

    private createHeadlineRow(story: News.IStory, shouldAppend: boolean) {
        const storyDateTimeField = story.getField(FieldId.FID_STORY_DATE_TIME);
        const magazineField = story.getField(FieldId.FID_MAGAZINE);
        const headlineField = story.getField(FieldId.FID_HEADLINE);
        if (storyDateTimeField.value == null || magazineField.value == null || headlineField.value == null) {
            return;
        }

        // Skip headlines with a previous link (i.e. just show first headline in chain).
        if (story.getField(FieldId.FID_PREVIOUS_NEWS_SYMBOL).value != null) {
            return;
        }

        const rowElement = this.headlineTable.insertRow(shouldAppend ? -1 : 0);
        rowElement.innerHTML = headlineHtml;
        rowElement.classList.add("news-viewer-headline-table-row");

        const timeElement = rowElement.querySelector(".news-viewer-time-column") as HTMLElement;
        // Convert received date to local (it is UTC but represented as a local Date).
        const dateTime = storyDateTimeField.value as Date;
        const localDateTime = new Date(
            Date.UTC(
                dateTime.getFullYear(),
                dateTime.getMonth(),
                dateTime.getDate(),
                dateTime.getHours(),
                dateTime.getMinutes(),
                dateTime.getSeconds()
            )
        );
        timeElement.textContent = `${this.dateFormat.format(localDateTime)} ${this.timeFormat.format(localDateTime)}`;

        const magazineElement = rowElement.querySelector(".news-viewer-magazine-column") as HTMLElement;
        magazineElement.textContent = formatField(magazineField);

        const headlineElement = rowElement.querySelector(".news-viewer-headline-column") as HTMLElement;
        const headlineText = formatField(headlineField);
        headlineElement.textContent = headlineText;
        headlineElement.title = headlineText;

        const symbol = story.newsSymbol;
        rowElement.addEventListener("click", () => this.getStoryBody(symbol));
    }

    private async getStoryBody(symbol: string) {
        this.unsubscribeStoryBody();

        if (this.client == null) {
            return;
        }

        try {
            const requestParameters = {
                query: `newsSymbol=${symbol}`,
                fieldIds: [
                    FieldId.FID_HEADLINE,
                    FieldId.FID_MAGAZINE,
                    FieldId.FID_SUPPLIER,
                    FieldId.FID_STORY_DATE_TIME,
                    FieldId.FID_STORY_BODY,
                    FieldId.FID_NEXT_NEWS_SYMBOL,
                    FieldId.FID_PREVIOUS_NEWS_SYMBOL,
                    FieldId.FID_CHARACTER_SET
                ],
                updateHandler: (update: News.IUpdate) => this.showStoryBody(update)
            };

            this.bodyRequestHandle = this.client.news.getStories(requestParameters);
            for await (const record of this.bodyRequestHandle) {
                this.showStoryBody(record);
                break;
            }
        } catch (e) {}
    }

    private unsubscribeStoryBody() {
        if (this.bodyRequestHandle != null) {
            this.bodyRequestHandle.delete();
            this.bodyRequestHandle = null;
        }
    }

    private static readonly comtextSuppliedClass = "news-viewer-comtex-supplied";

    private static setNavigationButton(field: IField, button: HTMLButtonElement): string | null {
        if (field.value == null) {
            NewsViewer.resetNavigationButton(button);

            return null;
        } else {
            button.hidden = false;
            button.title = field.value as string;

            return field.value as string;
        }
    }

    private static resetNavigationButton(button: HTMLButtonElement) {
        button.hidden = true;
        button.title = "";
    }

    private showStoryBody(story: News.IStory) {
        this.storySymbolElement.textContent = story.newsSymbol;

        const storyBodyField = story.getField(FieldId.FID_STORY_BODY);
        if (storyBodyField.value == null) {
            return;
        }

        // Encoding.
        const encodingField = story.getField(FieldId.FID_CHARACTER_SET);
        const encoding = encodingField.value != null ? (encodingField.value as string) : fallbackEncoding;

        // Display additional content if supplier is Comtex.
        const supplierField = story.getField(FieldId.FID_SUPPLIER);
        if (supplierField.value != null && (supplierField.value as string) === "Comtex") {
            this.articleElement.classList.add(NewsViewer.comtextSuppliedClass);
        } else {
            this.articleElement.classList.remove(NewsViewer.comtextSuppliedClass);
        }

        this.storyBodyHeadlineElement.textContent = formatField(story.getField(FieldId.FID_HEADLINE));

        const fieldValue = getTextDecoder(encoding).decode(storyBodyField.value as Uint8Array);
        const doc = this.storyBodyParser.parseFromString(fieldValue as string, "text/html");

        // Most stories seem to be a complete HTML document, so just grab the body if there is one.
        const docBody = doc.querySelector("body");
        if (docBody != null) {
            this.storyBodyElement.innerHTML = docBody.innerHTML;
        } else if (doc.firstChild != null) {
            // Otherwise just just the first chile of the parsed document.
            // Remove previous story, if any.
            this.storyBodyElement.innerHTML = "";
            this.storyBodyElement.appendChild(doc.firstChild);
        } else {
            // I don't think this can really happen. Parse failures create a document.
            this.storyBodyElement.innerHTML = "Unknown parse failure";
        }

        this.previousStorySymbol = NewsViewer.setNavigationButton(
            story.getField(FieldId.FID_PREVIOUS_NEWS_SYMBOL),
            this.previousStoryButton
        );
        this.nextStorySymbol = NewsViewer.setNavigationButton(story.getField(FieldId.FID_NEXT_NEWS_SYMBOL), this.nextStoryButton);

        this.articleContainerElement.scrollTop = 0;
    }

    private resetDisplay() {
        this.headlineTable.innerHTML = "";
        this.articleContainerElement.scrollTop = 0;
        this.articleElement.classList.remove(NewsViewer.comtextSuppliedClass);
        this.storyBodyHeadlineElement.innerHTML = "";
        this.storySymbolElement.innerHTML = "";
        this.storyBodyElement.innerHTML = "";
        NewsViewer.resetNavigationButton(this.previousStoryButton);
        NewsViewer.resetNavigationButton(this.nextStoryButton);
    }

    private setStatus(message: string | null) {
        this.status.textContent = message;
        this.overlay.style.display = message == null ? "none" : "";
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

export { Attributes };
export default NewsViewer;
