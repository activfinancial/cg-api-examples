/*
 * ChartIQ interfaces.
 */

// TODO bin this if/when they have TypeScript definitions.

export interface Chart {}

// ---------------------------------------------------------------------------------------------------------------------------------

export interface OhlcBar {
    Date?: string;
    DT?: Date;
    Open: number | null;
    High: number | null;
    Low: number | null;
    Close: number | null;
    Volume: number | null;
}

// ---------------------------------------------------------------------------------------------------------------------------------

export interface LastSale {
    Date?: string;
    DT?: Date;
    Last?: number;
    Volume?: number;
    Bid?: number;
    Ask?: number;
    BidL2?: [[number, number]];
    AskL2?: [[number, number]];
}

// ---------------------------------------------------------------------------------------------------------------------------------

export interface UpdateChartDataParams {
    noCreateDataSet?: boolean;
    noCleanupDates?: boolean;
    allowReplaceOHL?: boolean;
    bypassGovernor?: boolean;
    fillGaps?: boolean;
    secondarySeries?: string;
    deleteItems?: boolean;
    useAsLastSale?: boolean | { aggregatedVolume: boolean };
}

// ---------------------------------------------------------------------------------------------------------------------------------

export interface ChartEngine {
    updateChartData(appendQuotes: OhlcBar[] | LastSale, chart: Chart | null, params: UpdateChartDataParams): void;
}

// ---------------------------------------------------------------------------------------------------------------------------------

export enum SubscriptionReason {
    // These are empirical... not documented AFAICT. So may be more.
    initialize = "initialize",
    period = "period",
    symbol = "symbol"
}

// ---------------------------------------------------------------------------------------------------------------------------------

export interface SubscriptionInfo {
    stx: ChartEngine;
    // Looks like id only present for secondary series, which is handy as I can't see another way to tell.
    id?: string;
    symbol: string;
    symbolObject: {
        symbol: string;
    };
    reason: SubscriptionReason;
    period: number;
    interval: number;
    timeUnit: string;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Fetch response type. */
export interface FetchResponse {
    error?: string;
    quotes?: OhlcBar[];
    moreAvailable?: boolean;
    attribution?: any;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Fetch callback type. */
export interface FetchCallback {
    (response: FetchResponse): void;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** QuoteFeed interface. */
export interface QuoteFeed {
    subscribe?(subscriptionInfo: SubscriptionInfo): void;
    unsubscribe?(subscriptionInfo: SubscriptionInfo): void;
    fetchInitialData?(symbol: string, startDate: Date, endDate: Date, params: any, callback: FetchCallback): void;
    fetchPaginationData?(symbol: string, startDate: Date, endDate: Date, params: any, callback: FetchCallback): void;
    fetchUpdateData?(symbol: string, startDate: Date, params: any, callback: FetchCallback): void;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------------------

/** Symbol lookup result type. */
export interface LookupResult {
    display: string[];
    data: {
        symbol: string;
        name?: string;
        exchDis?: string;
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Symbol lookup callback type. */
export interface LookupCallback {
    (results: LookupResult[]): void;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Symbol lookup driver interface. */
export interface LookupDriver {
    acceptText(text: string, filter: string, maxResults: number | null, callback: LookupCallback): void;
}

// ---------------------------------------------------------------------------------------------------------------------------------

export declare var CIQ: any;
