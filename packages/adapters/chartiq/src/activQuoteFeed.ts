/*
 * ACTIV <> ChartIQ integration.
 */

import {
    Client,
    EntityType,
    EventType,
    FieldId,
    RelationshipId,
    Streaming,
    SymbolDirectory,
    TimeSeries,
    TRational
} from "@activfinancial/cg-api";

import {
    ChartEngine,
    FetchCallback,
    QuoteFeed,
    LookupDriver,
    LookupCallback,
    LookupResult,
    LastSale,
    OhlcBar,
    SubscriptionInfo,
    SubscriptionReason,
    UpdateChartDataParams
} from "./chartIq";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Function to make CG API request for a particular ChartIQ interval type. */
interface MakeRequest {
    (
        requestType: string,
        symbol: string,
        dateFormat: TimeSeries.PeriodType,
        startDate: Date,
        endDate: Date | null,
        params: any,
        callback: FetchCallback
    ): void;
}

/**
 * Function to adjust end date for a paging request for a particular ChartIQ interval type.
 * The ACTIV API is inclusive and we've already got the endDate, so adjust it by the interval * period.
 * TODO check server behavior; could maybe get away with -1ms.
 */
interface AdjustEndDate {
    (date: Date, params: any): Date;
}

interface IntervalMap {
    [key: string]: {
        /** Function to make CG API request for this ChartIQ interval type. */
        makeRequest: MakeRequest;

        /** Function to adjust end date for a paging request for this ChartIQ interval type. */
        adjustEndDate: AdjustEndDate;

        /** Series type for >= daily bars appropriate for this ChartIQ interval type. */
        seriesType?: TimeSeries.HistorySeriesType;
    };
}

interface SubscriptionEntry {
    /** Streaming update handle. */
    requestHandle?: Streaming.RequestHandle;

    /** The ChartEngine to update. */
    chartEngine: ChartEngine;

    /** Primary series on chart? */
    isPrimary: boolean;

    /** Streaming update handler. */
    processUpdate: (update: Streaming.Update) => void;

    /** Since we only get trade time. Stored as ms since epoch. */
    currentDate: number;
}

interface SubscriptionMap {
    [symbol: string]: SubscriptionEntry;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Helper to get milliseconds since midnight from a Date. */
function getMillisecondsSinceMidnight(date: Date) {
    return date.getMilliseconds() + date.getSeconds() * 1000 + date.getMinutes() * 60 * 1000 + date.getHours() * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** How to update the chart. */
export enum UpdateType {
    /** Static chart. */
    none,

    /** Poll for new bars. */
    poll,

    /** Subscribe to realtime updates. */
    subscribe
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * ChartIQ QuoteFeed interface for ACTIV TSS.
 */
export class ActivQuoteFeed implements QuoteFeed {
    // Helpers for mapping from ChartIQ intervals -> ACTIV intervals.
    private readonly intervalMap: IntervalMap = {
        minute: {
            makeRequest: (
                requestType: string,
                symbol: string,
                dateFormat: TimeSeries.PeriodType,
                startDate: Date,
                endDate: Date | null,
                params: any,
                callback: FetchCallback
            ) => this.makeIntradayRequest(requestType, symbol, dateFormat, startDate, endDate, params, callback),
            adjustEndDate: (date: Date, params: any) => {
                date.setMinutes(date.getMinutes() - params.period);
                return date;
            }
        },
        day: {
            makeRequest: (
                requestType: string,
                symbol: string,
                dateFormat: TimeSeries.PeriodType,
                startDate: Date,
                endDate: Date | null,
                params: any,
                callback: FetchCallback
            ) =>
                this.makeHistoryRequest(
                    requestType,
                    symbol,
                    dateFormat,
                    startDate,
                    endDate,
                    params,
                    callback,
                    TimeSeries.HistorySeriesType.dailyBars
                ),
            adjustEndDate: (date: Date, params: any) => {
                date.setDate(date.getDate() - params.period);
                return date;
            }
        },
        week: {
            makeRequest: (
                requestType: string,
                symbol: string,
                dateFormat: TimeSeries.PeriodType,
                startDate: Date,
                endDate: Date | null,
                params: any,
                callback: FetchCallback
            ) =>
                this.makeHistoryRequest(
                    requestType,
                    symbol,
                    dateFormat,
                    startDate,
                    endDate,
                    params,
                    callback,
                    TimeSeries.HistorySeriesType.weeklyBars
                ),
            adjustEndDate: (date: Date, params: any) => {
                date.setDate(date.getDate() - params.period * 7);
                return date;
            }
        },
        month: {
            makeRequest: (
                requestType: string,
                symbol: string,
                dateFormat: TimeSeries.PeriodType,
                startDate: Date,
                endDate: Date | null,
                params: any,
                callback: FetchCallback
            ) =>
                this.makeHistoryRequest(
                    requestType,
                    symbol,
                    dateFormat,
                    startDate,
                    endDate,
                    params,
                    callback,
                    TimeSeries.HistorySeriesType.monthlyBars
                ),
            adjustEndDate: (date: Date, params: any) => {
                date.setMonth(date.getMonth() - params.period);
                return date;
            }
        }
    };

    private clientPromise: Promise<Client> | null = null;
    private subscriptionMap: SubscriptionMap = {};

    /**
     * Constructor.
     *
     * @param client
     */
    constructor(private readonly updateType: UpdateType) {}

    setClient(clientPromise: Promise<Client> | null) {
        this.clientPromise = clientPromise;
    }

    // Start of ChartIQ interface.

    async subscribe(subscriptionInfo: SubscriptionInfo) {
        if (this.updateType !== UpdateType.subscribe) {
            return;
        }

        if (this.clientPromise == null) {
            return;
        }

        // TODO this is hole-y at the moment. On receipt of the first update, we really need to re-request the bars since the
        // "latest" from the initial response (including that bar itself as it was most likely in progress)
        // and update appropriately.

        // Even then, it would be a lot of work to handle trade cancels and corrections and whatever else the TSS does.
        // So polling is the better option.

        // Only interested in changes of symbol as we're receiving each trade; i.e. we can ignore period changes in the UI.
        switch (subscriptionInfo.reason) {
            case SubscriptionReason.initialize:
            case SubscriptionReason.symbol:
                break;

            default:
                return;
        }

        const subscriptionEntry: SubscriptionEntry = {
            chartEngine: subscriptionInfo.stx,
            // id only set on secondary series, by the looks of it.
            isPrimary: subscriptionInfo.id == null,
            processUpdate: function(update: Streaming.Update) {
                const lastSale: LastSale = {};
                let time: number = 0;

                for (const field of update.fieldData) {
                    if (!field.doesUpdateLastValue || field.value == null) {
                        continue;
                    }

                    // TODO sort out close

                    switch (field.id) {
                        case FieldId.FID_TRADE:
                            lastSale.Last = (field.value as TRational).valueOf();
                            break;

                        case FieldId.FID_TRADE_SIZE:
                            lastSale.Volume = field.value as number;
                            break;

                        case FieldId.FID_TRADE_TIME:
                            time = getMillisecondsSinceMidnight(field.value as Date);
                            break;

                        case FieldId.FID_TRADE_DATE:
                            this.currentDate = (field.value as Date).getTime();
                            break;
                    }
                }

                lastSale.DT = new Date(this.currentDate + time);

                const params: UpdateChartDataParams = {
                    fillGaps: true
                };
                if (!this.isPrimary) {
                    params.secondarySeries = update.responseKey.symbol;
                }

                this.chartEngine.updateChartData(lastSale, null, params);
            },
            currentDate: 0
        };

        const client = await this.clientPromise;

        subscriptionEntry.requestHandle = client.streaming.getEqual({
            key: subscriptionInfo.symbol,
            fieldIds: [
                FieldId.FID_TRADE,
                FieldId.FID_TRADE_SIZE,
                FieldId.FID_TRADE_DATE,
                FieldId.FID_TRADE_TIME,
                FieldId.FID_CLOSE
            ],
            subscription: {
                type: Streaming.SubscriptionType.eventTypeFilterIncludeList,
                eventTypes: [EventType.trade],
                updateHandler: (update: Streaming.Update) => {
                    subscriptionEntry.processUpdate(update);
                }
            }
        });

        for await (const record of subscriptionEntry.requestHandle) {
            // Need to cache trade date as updates will generally only have time.
            // Will be undefined out of hours but then we'll get it in an update.
            const tradeDate = record.getField(FieldId.FID_TRADE_DATE);
            if (tradeDate.value != null) {
                subscriptionEntry.currentDate = (tradeDate.value as Date).getTime();
            }
            break;
        }

        this.subscriptionMap[subscriptionInfo.symbol] = subscriptionEntry;
    }

    unsubscribe(subscriptionInfo: SubscriptionInfo) {
        if (this.updateType !== UpdateType.subscribe) {
            return;
        }

        // Only interested in changes of symbol as we're sending each trade; ignore period changes.
        if (subscriptionInfo.reason !== SubscriptionReason.symbol) {
            return;
        }

        const entry = this.subscriptionMap[subscriptionInfo.symbol];
        if (entry != null) {
            if (entry.requestHandle != null) {
                entry.requestHandle.delete();
            }
            delete this.subscriptionMap[subscriptionInfo.symbol];
        }
    }

    fetchInitialData(symbol: string, startDate: Date, endDate: Date, params: any, callback: FetchCallback) {
        const intervalInfo = this.intervalMap[params.interval];
        if (intervalInfo == null) {
            // TODO return an error, and/or adjust to best request?
            return;
        }

        // Initial requests are called with a date range in the timezone of the browser. If we passed those as
        // local time to the TSS, we'd get results in that literal range, but in the exchange's timezone.
        // So make the requests using UTC.
        intervalInfo.makeRequest(
            "fetchInitialData",
            symbol,
            TimeSeries.PeriodType.utcDateTime,
            startDate,
            endDate,
            params,
            callback
        );
    }

    fetchPaginationData(symbol: string, startDate: Date, endDate: Date, params: any, callback: FetchCallback) {
        const intervalInfo = this.intervalMap[params.interval];
        if (intervalInfo == null) {
            // TODO return an error, and/or adjust to best request?
            return;
        }

        // TODO getting stuck in an async loop here somehow; constantly called with same paging request.
        // Is it because of TZ? Our "last" date can be 5 hours ago... No "no more data" response code from the TSS
        // AFAIK. Actually might be OK now with utc/local sorted. Check.

        // Paging requests are called with the last time from a previous response, which will be local time
        // (in the TZ of the exchange). So we have to use local time in TSS requests, since we're not able to convert
        // received times in exchange timezone to our local timezone (currently).
        intervalInfo.makeRequest(
            "fetchPaginationData",
            symbol,
            TimeSeries.PeriodType.localDateTime,
            startDate,
            intervalInfo.adjustEndDate(endDate, params),
            params,
            callback
        );
    }

    fetchUpdateData(symbol: string, startDate: Date, params: any, callback: FetchCallback) {
        if (this.updateType !== UpdateType.poll) {
            return;
        }

        const intervalInfo = this.intervalMap[params.interval];
        if (intervalInfo == null) {
            // TODO return an error, and/or adjust to best request?
            return;
        }

        // Update is called with the last time from a previous response, which will be local time
        // (in the TZ of the exchange). So we have to use local time in TSS requests, since we're not able to convert
        // received times in exchange timezone to our local timezone (currently).
        intervalInfo.makeRequest("fetchUpdateData", symbol, TimeSeries.PeriodType.localDateTime, startDate, null, params, callback);
    }

    // End of ChartIQ interface.

    private static makeEndPeriod(dateFormat: TimeSeries.PeriodType, endDate: Date | null): TimeSeries.Period {
        return endDate ? { type: dateFormat, date: endDate } : { type: TimeSeries.PeriodType.now };
    }

    private async makeIntradayRequest(
        requestType: string,
        symbol: string,
        dateFormat: TimeSeries.PeriodType,
        startDate: Date,
        endDate: Date | null,
        params: any,
        callback: FetchCallback
    ) {
        if (this.clientPromise == null) {
            callback({ error: "Not connected" });
            return;
        }

        let seriesType: TimeSeries.IntradaySeriesType;

        switch (params.period) {
            case 1:
                seriesType = TimeSeries.IntradaySeriesType.oneMinuteBars;
                break;

            case 5:
                seriesType = TimeSeries.IntradaySeriesType.fiveMinuteBars;
                break;

            default:
                seriesType = TimeSeries.IntradaySeriesType.specifiedMinuteBars;
                break;
        }

        const client = await this.clientPromise;
        const requestHandle = client.timeSeries.getIntraday({
            key: symbol,
            seriesType,
            minuteInterval: params.period, // No need to special case; ignored with 1 and 5 minute bars.
            periods: [{ type: dateFormat, date: startDate }, ActivQuoteFeed.makeEndPeriod(dateFormat, endDate)],
            fieldFilterType: TimeSeries.IntradayFieldFilterType.miniBar,
            // TODO if the display window is small this might return nothing and then we can't page at all...
            recordFilterType: TimeSeries.IntradayRecordFilterType.regularTrades
        });

        this.processResponses(requestType, requestHandle, callback);
    }

    private async makeHistoryRequest(
        requestType: string,
        symbol: string,
        dateFormat: TimeSeries.PeriodType,
        startDate: Date,
        endDate: Date | null,
        params: any,
        callback: FetchCallback,
        seriesType: TimeSeries.HistorySeriesType
    ) {
        if (this.clientPromise == null) {
            callback({ error: "Not connected" });
            return;
        }

        const client = await this.clientPromise;
        const requestHandle = client.timeSeries.getHistory({
            key: symbol,
            seriesType,
            periods: [{ type: dateFormat, date: startDate }, ActivQuoteFeed.makeEndPeriod(dateFormat, endDate)],
            fieldFilterType: TimeSeries.HistoryFieldFilterType.miniBar
        });

        this.processResponses(requestType, requestHandle, callback);
    }

    private processResponses<T extends TimeSeries.BarFieldSet>(
        requestType: string,
        requestHandle: TimeSeries.RequestHandle<T>,
        callback: FetchCallback
    ) {
        (async () => {
            let quotes: any = [];

            try {
                for await (const record of requestHandle) {
                    const bar: OhlcBar = {
                        DT: record.dateTime,
                        // "+" required in TypeScript pending implementation of
                        // https://github.com/Microsoft/TypeScript/issues/2361
                        Open: record.open ? +record.open : null,
                        High: record.high ? +record.high : null,
                        Low: record.low ? +record.low : null,
                        Close: record.close ? +record.close : null,
                        Volume: record.totalVolume
                    };

                    quotes.push(bar);
                }

                // Calling back once with the complete result set. Calling inside the for-await above seems to work,
                // but I think the callback invokes the next paging request for an initial load - so we might end up
                // making more requests than are necessary (each partial response might results in a paging request)
                // somewhat in parallel.
                callback({ quotes });
                console.log(`${quotes.length} bars in ${requestType} response`);
            } catch (e) {
                callback({ error: e.message });
            }
        })();
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * ChartIQ symbol lookup interface for ACTIV.
 */
export class ActivLookupDriver implements LookupDriver {
    private clientPromise: Promise<Client> | null = null;
    private requestCounter: number = 0;

    // TODO not sure how to get the ciqInheritsFrom() working but equally in chartiq/js/symbolLookup.js
    // there doesn't seem to be much in the base CIQ.ChartEngine.Driver.Lookup to inherit!
    // All works without it.
    // CIQ.ChartEngine.Driver.Lookup.ActivDriver = ActivLookupDriver;
    // CIQ.ChartEngine.Driver.Lookup.ActivDriver.ciqInheritsFrom(CIQ.ChartEngine.Driver.Lookup);

    /**
     * Constructor.
     *
     * @param maxResults
     */
    constructor(private readonly maxResults: number = 100) {}

    setClient(clientPromise: Promise<Client> | null) {
        this.clientPromise = clientPromise;
    }

    async acceptText(text: string, filter: string, maxResults: number | null, callback: LookupCallback) {
        if (this.clientPromise == null) {
            return;
        }

        const thisMaxResults = Math.min(Number(maxResults), this.maxResults) || this.maxResults;
        let entityTypes: EntityType[] = [];
        let filterType: SymbolDirectory.FilterType = SymbolDirectory.FilterType.includeEntityTypes;

        // TODO fill out the entity types.
        switch (filter) {
            case "STOCKS":
                entityTypes.push(EntityType.equity);
                break;

            case "FX":
                entityTypes.push(EntityType.forex);
                break;

            case "INDEXES":
                entityTypes.push(EntityType.index);
                break;

            case "FUNDS":
                entityTypes.push(EntityType.mutualFund);
                break;

            case "FUTURES":
                entityTypes.push(EntityType.future);
                break;

            default:
                filterType = SymbolDirectory.FilterType.full;
                break;
        }

        const thisRequestCounter = ++this.requestCounter;
        let results: LookupResult[] = [];
        const client = await this.clientPromise;

        try {
            const requestHandle = client.symbolDirectory.getSymbols({
                search: text,
                fieldId: FieldId.FID_LOCAL_CODE,
                matchType: SymbolDirectory.MatchType.exact,
                entityTypes,
                filterType
            });

            await this.processResponse(requestHandle, thisRequestCounter, results, thisMaxResults);
        } catch (e) {}

        if (results.length < thisMaxResults) {
            try {
                const requestHandle = client.symbolDirectory.getSymbols({
                    search: text,
                    fieldId: FieldId.FID_NAME,
                    matchType: SymbolDirectory.MatchType.exact,
                    entityTypes,
                    filterType
                });

                await this.processResponse(requestHandle, thisRequestCounter, results, thisMaxResults);
            } catch (e) {}
        }

        if (thisRequestCounter !== this.requestCounter) {
            return;
        }

        // Get name; matchData from SymbolDirectory isn't great for a symbol based lookup.
        interface SymbolToName {
            [symbol: string]: string;
        }
        const names: SymbolToName = {};

        try {
            const nameRequest = client.streaming.getEqual({
                key: results.map((entry) => entry.data.symbol),
                relationships: {
                    [RelationshipId.company]: {
                        fieldIds: [FieldId.FID_NAME]
                    }
                }
            });

            for await (const record of nameRequest) {
                const nameField = record.getField(FieldId.FID_NAME);
                if (nameField.value != null) {
                    names[record.requestedKey.symbol] = nameField.value as string;
                }
            }
        } catch (e) {}

        if (thisRequestCounter !== this.requestCounter) {
            return;
        }

        // Update results with any nice names found.
        for (const entry of results) {
            const name = names[entry.data.symbol];
            if (name != null) {
                entry.display[1] = name;
            }
        }

        // Pass back results.
        callback(results);
    }

    private async processResponse(
        requestHandle: SymbolDirectory.RequestHandle,
        thisRequestCounter: number,
        results: LookupResult[],
        maxResults: number
    ) {
        const client = await this.clientPromise;

        for await (const record of requestHandle) {
            if (thisRequestCounter !== this.requestCounter) {
                // Ignore response; filter box has been edited whilst waiting for response.
                return;
            }

            let exchangeName: string = "";
            try {
                exchangeName = (await client!.metaData.getExchangeInfo(record.symbolId.symbol)).name;
            } catch (e) {}

            let matchData = record.matchData;

            results.push({
                data: { symbol: record.symbolId.symbol },
                display: [record.symbolId.symbol, matchData, exchangeName, EntityType[record.entityType]]
            });

            if (results.length >= maxResults) {
                return;
            }
        }
    }
}
