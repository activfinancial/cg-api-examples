/*
 * Time series chart custom element.
 */

import { Client, FieldId, TimeSeries, RelationshipId, Streaming } from "@activfinancial/cg-api";
import { IExample, IExampleStats, ExampleStats } from "@activfinancial/cg-api";

import { addUnloadHandler } from "../../../common/utils";

// Note leading ! overrides webpack config matching css files.
import commonCss from "!raw-loader!../../common/common.css";
import indexCss from "!raw-loader!../style/index.css";

import indexHtml from "!raw-loader!./index.html";

import { LitElement, customElement, property, PropertyValues } from "lit-element";

import bb, { PrimitiveArray } from "billboard.js";
import bbCss from "raw-loader!billboard.js/dist/billboard.min.css";

import { ResizeObserver } from "resize-observer";

// ---------------------------------------------------------------------------------------------------------------------------------

const dateFormat = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric"
});

// ---------------------------------------------------------------------------------------------------------------------------------

// TODO surely we can automagically generate this (or vice-versa) from the props static below? Too much repetition.
/** Attributes interface. */
interface Attributes {
    symbol: string;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 *	Time series chart WebComponent.
 */
@customElement("time-series-chart")
class Chart extends LitElement implements IExample {
    private readonly rootElement: HTMLDivElement;
    private readonly symbolLabel: HTMLHeadingElement;
    private readonly nameLabel: HTMLHeadingElement;
    private readonly chartElementWrapper: HTMLDivElement;
    private readonly chartElement: HTMLDivElement;
    private readonly status: HTMLDivElement;
    private readonly overlay: HTMLDivElement;
    private readonly resizeObserver = new ResizeObserver(() => {
        if (this.chart != null) {
            this.chart.resize({ height: this.getChartHeight() });
        }
    });

    private clientPromise: Promise<Client> | null = null;
    private api: Client | null = null;
    private requestHandle: TimeSeries.RequestHandle<TimeSeries.HistoryBar> | null = null;
    private symbolInfoRequestHandle: Streaming.RequestHandle | null = null;
    private chart: bb.Chart | null = null;

    private stats = new ExampleStats();
    // props.
    @property()
    symbol: string = "";

    constructor() {
        super();

        this.rootElement = document.createElement("div");
        this.rootElement.className = "activ-cg-api-webcomponent time-series-chart";
        this.rootElement.innerHTML = `<style>${commonCss}${indexCss}${bbCss}</style>${indexHtml}`;
        (this.renderRoot as HTMLElement).appendChild(this.rootElement);

        this.symbolLabel = this.rootElement.querySelector(".time-series-chart-title-symbol") as HTMLHeadingElement;
        this.nameLabel = this.rootElement.querySelector(".time-series-chart-title-name") as HTMLHeadingElement;
        this.chartElementWrapper = this.rootElement.querySelector(".time-series-chart-wrapper") as HTMLDivElement;
        this.chartElement = this.rootElement.querySelector(".time-series-chart-body") as HTMLDivElement;
        this.status = this.rootElement.querySelector(".time-series-chart-status") as HTMLDivElement;
        this.overlay = this.rootElement.querySelector(".time-series-chart-overlay") as HTMLDivElement;

        // HACK see comment in getChartHeight().
        this.resizeObserver.observe(this.chartElementWrapper);

        addUnloadHandler(() => this.destroyChart());

        this.setStatus("Waiting...");
    }

    async connect(connected: Promise<Client>) {
        if (this.clientPromise === connected) {
            return;
        }

        this.clientPromise = connected;
        this.setStatus("Connecting...");

        try {
            this.api = await connected;
        } catch (e) {
            this.setStatus(`Error connecting: ${e}`);
            throw e;
        }

        this.setStatus("Connected");
        this.createChart();

        try {
            await this.api.disconnected;
            this.setStatus("Disconnected");
        } catch (e) {
            this.setStatus(`Connection broken: ${e}`);
        } finally {
            this.destroyChart();
            this.api = null;
        }
    }

    shouldUpdate(changedProperties: PropertyValues) {
        // Check for properties that require a resubscribe if they change.
        // TODO automate this from the Attributes interface somehow...
        if (changedProperties.has("symbol")) {
            this.createChart();
        }

        return true;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.destroyChart();
    }

    getStats(): IExampleStats {
        return this.stats;
    }

    private async createChart() {
        this.destroyChart();

        this.symbolLabel.textContent = this.symbol;

        if (this.api == null || this.symbol === "") {
            return;
        }

        this.stats = new ExampleStats();
        this.setStatus("Getting data...");

        // Some metadata. Fire off in the background and render when we get a response.
        (async () => {
            this.symbolInfoRequestHandle = this.api!.streaming.getEqual({
                key: this.symbol,
                relationships: {
                    [RelationshipId.company]: {
                        fieldIds: [FieldId.FID_NAME]
                    }
                }
            });

            for await (const record of this.symbolInfoRequestHandle) {
                const nameField = record.getField(FieldId.FID_NAME);
                if (nameField.value != null) {
                    this.nameLabel.textContent = nameField.value as string;
                }
            }
        })();

        // Daily bar request.
        this.requestHandle = this.api.timeSeries.getHistory({
            key: this.symbol,
            seriesType: TimeSeries.HistorySeriesType.dailyBars,
            periods: [{ type: TimeSeries.PeriodType.tradingDayCount, count: 1500 }, { type: TimeSeries.PeriodType.now }],
            fieldFilterType: TimeSeries.HistoryFieldFilterType.miniBar
        });

        try {
            let times: [string, ...PrimitiveArray] = [""];
            let closePrices: [string, ...PrimitiveArray] = [""];

            const resetResultArrays = () => {
                times = ["dateTime"];
                closePrices = ["close"];
            };
            resetResultArrays();

            const updateChart = () => {
                if (this.chart == null) {
                    this.setStatus(null);

                    this.chart = bb.generate({
                        bindto: this.chartElement,
                        data: {
                            x: "dateTime",
                            columns: [times, closePrices]
                        },
                        size: {
                            height: this.getChartHeight()
                        },
                        axis: {
                            x: {
                                type: "timeseries",
                                tick: {
                                    format: (dateTime: number | Date) => {
                                        try {
                                            return dateFormat.format(dateTime);
                                        } catch (e) {
                                            return "";
                                        }
                                    },
                                    // HACK -45 not rendering properly with billboard.js.
                                    rotate: 45,
                                    fit: true,
                                    count: 100
                                }
                            }
                        },
                        grid: {
                            y: {
                                show: true
                            }
                        },
                        legend: {
                            position: "right"
                        },
                        zoom: {
                            enabled: true,
                            rescale: true
                        },
                        onresize: () => {
                            // HACK see comment in getChartHeight().
                            this.chartElement.style.maxHeight = "none";
                            const svg = this.chartElement.querySelector("svg");
                            if (svg != null) {
                                svg.setAttribute("height", "0");
                            }
                        }
                    });
                } else {
                    this.chart.flow({
                        columns: [times, closePrices],
                        // HACK works around a bug where the axis labels go screwy after a flow().
                        done: () => this.chart!.show("close")
                    });
                }

                resetResultArrays();
            };

            for await (const historyBar of this.requestHandle) {
                if (0 === this.stats.responsesReturned) {
                    this.stats.initialResponseTimestamp = performance.now();
                }

                if (historyBar.close != null) {
                    times.push(historyBar.dateTime);
                    closePrices.push(historyBar.close!.valueOf());
                }

                // Draw the chart every now and then.
                if (0 === ++this.stats.responsesReturned % 1000) {
                    updateChart();
                }
            }

            updateChart();
            this.stats.renderingCompleteTimestamp = performance.now();
        } catch (e) {
            this.setStatus(`Error getting data: ${e}`);
        }
    }

    private destroyChart() {
        this.chartElement.innerHTML = "";
        if (this.chart != null) {
            this.chart.destroy();
            this.chart = null;
        }

        if (this.requestHandle != null) {
            this.requestHandle.delete();
            this.requestHandle = null;
        }

        if (this.symbolInfoRequestHandle != null) {
            this.symbolInfoRequestHandle.delete();
            this.symbolInfoRequestHandle = null;
        }
    }

    private setStatus(message: string | null) {
        this.status.textContent = message;
        this.overlay.style.display = message == null ? "none" : "";
    }

    private getChartHeight() {
        // HACK bb API doesn't allow relative sizes (e.g. 100%) and will default to 320px if not specified.
        // So dig out size of parent to use as explicit height. Does mean height resizing won't be great.
        return this.chartElementWrapper.clientHeight;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

export { Attributes };
export default Chart;
