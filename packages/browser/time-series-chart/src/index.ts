/*
 * Time series chart custom element.
 */

import { Client, FieldId, TimeSeries, RelationshipId } from "@activfinancial/cg-api";
import { IExample, IExampleStats, ExampleStats } from "@activfinancial/cg-api";

import { addUnloadHandler } from "../../../common/utils";

// Note leading ! overrides webpack config matching css files.
import commonCss from "!raw-loader!../../common/common.css";
import indexCss from "!raw-loader!../style/index.css";

import indexHtml from "!raw-loader!./index.html";

import { props, withLifecycle, withRenderer, withUpdate } from "skatejs";

import c3, { PrimitiveArray } from "c3";
import c3Css from "raw-loader!c3/c3.css";

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

class Chart extends withLifecycle(withRenderer(withUpdate(HTMLElement))) implements IExample {
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
    private chart: c3.ChartAPI | null = null;

    private stats = new ExampleStats();
    // props.
    symbol: string = "";

    static readonly props = {
        symbol: props.string
    };

    constructor() {
        super();

        this.rootElement = document.createElement("div");
        this.rootElement.className = "activ-cg-api-webcomponent time-series-chart";
        this.rootElement.innerHTML = `<style>${commonCss}${indexCss}${c3Css}</style>${indexHtml}`;
        (this.renderRoot as HTMLElement).appendChild(this.rootElement);

        this.symbolLabel = this.rootElement.querySelector(".time-series-chart-title-symbol") as HTMLHeadingElement;
        this.nameLabel = this.rootElement.querySelector(".time-series-chart-title-name") as HTMLHeadingElement;
        this.chartElementWrapper = this.rootElement.querySelector(".time-series-chart-wrapper") as HTMLDivElement;
        this.chartElement = this.rootElement.querySelector(".time-series-chart-body") as HTMLDivElement;
        this.status = this.rootElement.querySelector(".time-series-chart-status") as HTMLDivElement;
        this.overlay = this.rootElement.querySelector(".time-series-chart-overlay") as HTMLDivElement;

        // HACK see comment in getChartHeight().
        this.resizeObserver.observe(this.chartElementWrapper);

        // TODO see note in disconnectedCallback.
        // addUnloadHandler(() => this.unsubscribe());

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

    updated() {
        this.createChart();
    }

    disconnected() {
        // TODO probably move requestHandle to a member so we can delete it in case this element
        // is removed mid way through the request.
    }

    async createChart() {
        this.destroyChart();

        this.symbolLabel.textContent = this.symbol;

        if (this.api == null || this.symbol === "") {
            return;
        }

        this.stats = new ExampleStats();
        this.setStatus("Getting data...");

        // Some metadata. Fire off in the background and render when we get a response.
        // TODO should probably cache the request for cancellation when we do the tss request also.
        (async () => {
            const infoRequest = this.api!.streaming.getEqual({
                key: this.symbol,
                relationships: {
                    [RelationshipId.company]: {
                        fieldIds: [FieldId.FID_NAME]
                    }
                }
            });

            for await (const record of infoRequest) {
                const nameField = record.getField(FieldId.FID_NAME);
                if (nameField.value != null) {
                    this.nameLabel.textContent = nameField.value as string;
                }
            }
        })();

        // Daily bar request.
        const historyRequestHandle = this.api.timeSeries.getHistory({
            key: this.symbol,
            seriesType: TimeSeries.HistorySeriesType.dailyBars,
            periods: [{ type: TimeSeries.PeriodType.tradingDayCount, count: 1500 }, { type: TimeSeries.PeriodType.now }],
            fieldFilterType: TimeSeries.HistoryFieldFilterType.miniBar
        });

        try {
            let times: [string, ...PrimitiveArray];
            let closePrices: [string, ...PrimitiveArray];

            const resetResultArrays = () => {
                times = ["dateTime"];
                closePrices = ["close"];
            };
            resetResultArrays();

            const updateChart = () => {
                if (this.chart == null) {
                    this.setStatus(null);

                    this.chart = c3.generate({
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
                                    rotate: -45,
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

            for await (const historyBar of historyRequestHandle) {
                if (0 === this.stats.responsesReturned) {
                    this.stats.initialResponseTimestamp = performance.now();
                }

                if (historyBar.close != null) {
                    // HACK problem in c3 type definitions as of 0.7.2? Won't accept Date any longer.
                    times!.push(historyBar.dateTime as any);
                    closePrices!.push(historyBar.close!.valueOf());
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

    destroyChart() {
        this.chartElement.innerHTML = "";
        if (this.chart != null) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    getStats(): IExampleStats {
        return this.stats;
    }

    private setStatus(message: string | null) {
        this.status.textContent = message;
        this.overlay.style.display = message == null ? "none" : "";
    }

    private getChartHeight() {
        // HACK c3 API doesn't allow relative sizes (e.g. 100%) and will default to 320px if not specified.
        // So dig out size of parent to use as explicit height. Does mean height resizing won't be great.
        return this.chartElementWrapper.clientHeight;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

window.customElements.define("time-series-chart", Chart);

export { Attributes };
export default Chart;
