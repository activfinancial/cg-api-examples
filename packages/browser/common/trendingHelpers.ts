/*
 * Field formatting helpers shared across samples for consistent display.
 */

import { Trend } from "@activfinancial/cg-api";

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
