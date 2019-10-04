/*
 * Field formatting helpers shared across samples for consistent display.
 */

import { FieldId, TRational, Trend, TrendType } from "@activfinancial/cg-api";

import trendUpArrow from "!url-loader!./trendUpArrow.svg";
import trendDownArrow from "!url-loader!./trendDownArrow.svg";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Add trend up/down arrow to an element. */
export function applyTrendStyle(trend: Trend, element: HTMLElement) {
    const anyElement: any = element;

    if (anyElement.activTRationalTrend == null) {
        // Initial call for this element.
        if (element.style.paddingLeft === "") {
            element.style.paddingLeft = "1rem";
        }
    } else if (anyElement.activTRationalTrend === trend) {
        // No need to touch trend styling.
        return;
    }

    anyElement.activTRationalTrend = trend;

    switch (trend) {
        case Trend.up:
            element.style.backgroundImage = `url('${trendUpArrow}')`;
            element.style.color = "var(--shadow-trend-up-color)";
            break;

        case Trend.down:
            element.style.backgroundImage = `url('${trendDownArrow}')`;
            element.style.color = "var(--shadow-trend-down-color)";
            break;

        default:
            element.style.backgroundImage = "";
            element.style.color = "";
            break;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Clear any trending from an element. */
export function clearTrendStyle(element: HTMLElement) {
    const anyElement: any = element;

    if (anyElement.activTRationalTrend != null) {
        delete anyElement.activTRationalTrend;

        anyElement.style.backgroundImage = "";
        anyElement.style.color = "";
    }
}

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
