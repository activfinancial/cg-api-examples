/*
 * News viewer custom element.
 */

import { Client, Field, FieldId, News } from "@activfinancial/cg-api";
import { IExample, IExampleStats, ExampleStats } from "@activfinancial/cg-api";

import { formatField } from "../../common/formatFieldValue";
import { addUnloadHandler } from "../../../common/utils";

// Note leading ! overrides webpack config matching css files.
import commonCss from "!raw-loader!../../common/common.css";
import indexCss from "!raw-loader!../style/index.css";

// HACK sort this out properly. Can't get a WebComponent importing fontawesome like cg-api-explorer.
import indexHtml from "!html-loader!./index.html";
import headlineHtml from "!html-loader!./headlineRow.html";

import angleLeft from "!raw-loader!@fortawesome/fontawesome-free/svgs/solid/angle-left.svg";
import angleRight from "!raw-loader!@fortawesome/fontawesome-free/svgs/solid/angle-right.svg";

const uriEncodedAngleLeft = encodeURIComponent(angleLeft);
const uriEncodedAngleRight = encodeURIComponent(angleRight);

import comtexLogo from "!url-loader!../img/comtex-logo.png";

import { props, withLifecycle, withRenderer, withUpdate } from "skatejs";

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
type TextDecoders = {
    [key: string]: TextDecoder;
};

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

class NewsViewer extends withLifecycle(withRenderer(withUpdate(HTMLElement))) implements IExample {
    private readonly rootElement: HTMLDivElement;
    private readonly status: HTMLDivElement;
    private readonly overlay: HTMLDivElement;
    private readonly headlineTable: HTMLTableElement;
    private readonly articleElement: HTMLElement;
    private readonly storyBodyHeadlineElement: HTMLElement;
    private readonly storySymbolElement: HTMLElement;
    private readonly previousStoryButton: HTMLButtonElement;
    private readonly nextStoryButton: HTMLButtonElement;
    private readonly storyBodyElement: HTMLDivElement;

    private clientPromise: Promise<Client> | null = null;
    private client: Client | null = null;
    private headlineRequestHandle: News.RequestHandle | null = null;
    private bodyRequestHandle: News.RequestHandle | null = null;

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
    query: string = "";

    static readonly props = {
        query: props.string
    };

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

        this.previousStoryButton.style.backgroundImage = `url('data:image/svg+xml,${uriEncodedAngleLeft}')`;
        this.nextStoryButton.style.backgroundImage = `url('data:image/svg+xml,${uriEncodedAngleRight}')`;

        const comtexLogoElement = this.rootElement.querySelector("#comtexLogo") as HTMLImageElement;
        comtexLogoElement.src = comtexLogo;

        addUnloadHandler(() => this.unsubscribe());

        this.setStatus("Waiting...");
    }

    async connect(connected: Promise<Client>) {
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

    updated() {
        this.subscribe();
    }

    disconnected() {
        this.unsubscribe();
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
                updateHandler: (update: News.Update) => this.processUpdate(update),
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

    getStats(): IExampleStats {
        return this.stats;
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

    private processRecord(record: News.Story) {
        ++this.stats.responsesReturned;

        // Results are newest first, so append to the headline table.
        this.createHeadlineRow(record, true);
    }

    private processUpdate(update: News.Update) {
        ++this.stats.totalUpdates;

        if (update.isNewRecord) {
            this.createHeadlineRow(update, false);
        }
    }

    private createHeadlineRow(story: News.Story, shouldAppend: boolean) {
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
        headlineElement.textContent = formatField(headlineField);
        headlineElement.title = headlineElement.textContent;

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
                updateHandler: (update: News.Update) => this.showStoryBody(update)
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

    private resetNavigationButton(button: HTMLButtonElement) {
        button.hidden = true;
        button.title = "";
    }

    private showStoryBody(story: News.Story) {
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

        if (doc.firstChild != null) {
            if (this.storyBodyElement.lastChild != null) {
                this.storyBodyElement.removeChild(this.storyBodyElement.lastChild);
            }
            this.storyBodyElement.appendChild(doc.firstChild);
        }

        const setNavigationButton = (field: Field, button: HTMLButtonElement): string | null => {
            if (field.value == null) {
                this.resetNavigationButton(button);

                return null;
            } else {
                button.hidden = false;
                button.title = field.value as string;

                return field.value as string;
            }
        };

        this.previousStorySymbol = setNavigationButton(story.getField(FieldId.FID_PREVIOUS_NEWS_SYMBOL), this.previousStoryButton);
        this.nextStorySymbol = setNavigationButton(story.getField(FieldId.FID_NEXT_NEWS_SYMBOL), this.nextStoryButton);

        this.articleElement.scrollTop = 0;
    }

    private resetDisplay() {
        this.headlineTable.innerHTML = "";
        this.articleElement.classList.remove(NewsViewer.comtextSuppliedClass);
        this.storyBodyHeadlineElement.innerHTML = "";
        this.storySymbolElement.innerHTML = "";
        this.storyBodyElement.innerHTML = "";
        this.resetNavigationButton(this.previousStoryButton);
        this.resetNavigationButton(this.nextStoryButton);
    }

    private setStatus(message: string | null) {
        this.status.textContent = message;
        this.overlay.style.display = message == null ? "none" : "";
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

window.customElements.define("news-viewer", NewsViewer);

export { Attributes };
export default NewsViewer;
