/*
 * Trending helpers.
 */

import { FieldId, TRational, Trend, TrendType } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Function that takes a TRational and returns a Trend. */
export interface TrendHelper {
    (value: TRational): Trend;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Get a Trend value based on a TRational's value. E.g. for fields such as FID_NET_CHANGE. */
export function getValueTrend(value: TRational) {
    if (value.numerator > 0) {
        return Trend.up;
    } else if (value.numerator < 0) {
        return Trend.down;
    } else {
        return Trend.unchanged;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * Get a function to extract a particular trend type from a TRational based on "data-activ-trend-type" attribute on an element.
 * Default to "tick" if attribute is not defined.
 */
export function getTrendHelperFromElement(fieldId: FieldId, element: HTMLElement): TrendHelper {
    // Override default "tick" trending for a field?
    const trendTypeStr = element.getAttribute("data-activ-trend-type");

    return getTrendHelperFromString(fieldId, trendTypeStr || "tick");
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * Get a function to extract a particular trend type from a TRational based on a string TrendType or "value" to
 * trend on an actual value.
 */
export function getTrendHelperFromString(fieldId: FieldId, trendTypeStr: string): TrendHelper {
    const trendType = trendTypeStr as keyof typeof TrendType;

    if (TrendType[trendType] != null) {
        return (value: TRational) => value.trends[trendType];
    } else if (trendTypeStr === "value") {
        return getValueTrend;
    } else {
        throw Error(`Invalid trend type ${trendTypeStr} for field ${fieldId}`);
    }
}
