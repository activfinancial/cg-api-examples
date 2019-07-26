/*
 * Time series chart example using ChartIQ.
 */

import { connect, Client, asyncSleep } from "@activfinancial/cg-api";
import { domReady } from "../../../common/utils";
import { ActivQuoteFeed, ActivLookupDriver, UpdateType } from "@activfinancial/chartiq-adapter";

// Import the pretty much vanilla ChartIQ example JS code.
// It has a few mods to allow passing in our quote feed and symbol lookup objects.
import initChartIq from "./initChartIq";

// ---------------------------------------------------------------------------------------------------------------------------------

class Chart {
    private readonly quoteFeed = new ActivQuoteFeed(UpdateType.poll);
    private readonly lookupDriver = new ActivLookupDriver();

    /**
     * Constructor.
     *
     * @param client connection to ContentGateway.
     */
    constructor(clientPromise: Promise<Client>) {
        this.setClient(clientPromise);
        initChartIq(this.quoteFeed, this.lookupDriver);
    }

    /**
     * Update the connection to the ContentGateway after a break / reconnect.
     *
     * @param client
     */
    setClient(clientPromise: Promise<Client> | null) {
        this.quoteFeed.setClient(clientPromise);
        this.lookupDriver.setClient(clientPromise);
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

(async function() {
    await domReady(document);

    let chart: Chart | null = null;
    let isDone = false;

    while (true) {
        try {
            // Sample code (in initChartIq()) will try to restore previous charts immediately.
            // So we need a connection up front and defer calling initChartIq() until then.
            // TODO refactor the sample code to decouple general initialization from the initial chart requests.

            const clientPromise = (connect as any)({
                // userId: "USERNAME",
                // password: "PASSWORD",
                // url: "ams://cg-ny4-replay.activfinancial.com:9002/ContentGateway:Service"
                url: "ams://cg-ny4-web.activfinancial.com/ContentGateway:Service"
            });

            if (chart == null) {
                chart = new Chart(clientPromise);
            } else {
                chart.setClient(clientPromise);
            }

            const client = await clientPromise;
            console.log("Connected");

            // Wait for a break or disconnect.
            await client.disconnected;
            isDone = true;
        } catch (e) {
            console.log(e);
        }

        if (chart != null) {
            chart!.setClient(null);
        }

        if (isDone) {
            break;
        }

        await asyncSleep(5000);
    }
})();
