/*
 * Simple node time series sample.
 */

import { connect, TimeSeries } from "@activfinancial/cg-api";
import commander from "commander";

// ---------------------------------------------------------------------------------------------------------------------------------

import { version, description } from "../package.json";

const commandLineParser = commander
    .version(version)
    .description(description)
    .option("--url [url]", "ContentGateway URL", "ams://cg-ny4-web.activfinancial.com/ContentGateway:Service")
    .option("--userId <userId>", "user id")
    .option("--password <password>", "password")
    .option("--symbol <symbol>", "symbol", "MSFT.")
    .option("--no-display", "don't display records")
    .parse(process.argv);

// ---------------------------------------------------------------------------------------------------------------------------------

(async function() {
    try {
        // Connect to ContentGateway.
        console.log(`Connecting to ${commandLineParser.url}...`);

        const contentGatewayClient = await connect({
            url: commandLineParser.url,
            userId: commandLineParser.userId,
            password: commandLineParser.password
        });

        console.log(`Connected to ${commandLineParser.url}`);

        // Daily bar request.
        const historyRequestHandle = contentGatewayClient.timeSeries.getHistory({
            key: commandLineParser.symbol,
            seriesType: TimeSeries.HistorySeriesType.dailyBars,
            periods: [{ type: TimeSeries.PeriodType.tradingDayCount, count: 5 }, { type: TimeSeries.PeriodType.now }],
            fieldFilterType: TimeSeries.HistoryFieldFilterType.fullBar
        });

        console.log("\nDaily results:");
        let numberOfHistoryBars: number = 0;
        for await (const historyBar of historyRequestHandle) {
            if (commandLineParser.display) {
                console.log(historyBar);
            }
            ++numberOfHistoryBars;
        }
        console.log(`Retrieved ${numberOfHistoryBars} history bar${1 === numberOfHistoryBars ? `` : `s`}.`);

        // Tick request.
        const tickRequestHandle = contentGatewayClient.timeSeries.getTicks({
            key: commandLineParser.symbol,
            periods: [{ type: TimeSeries.PeriodType.dataPointCount, count: 5 }, { type: TimeSeries.PeriodType.now }],
            recordFilterType: TimeSeries.TickRecordFilterType.none
        });

        let numberOfTicks: number = 0;
        console.log("Tick results:");
        for await (const tick of tickRequestHandle) {
            if (commandLineParser.display) {
                console.log(tick);
            }
            ++numberOfTicks;
        }
        console.log(`Retrieved ${numberOfTicks} tick${1 === numberOfTicks ? `` : `s`}.`);

        // Intraday bar request.
        const intradayRequestHandle = contentGatewayClient.timeSeries.getIntraday({
            key: commandLineParser.symbol,
            seriesType: TimeSeries.IntradaySeriesType.oneMinuteBars,
            periods: [{ type: TimeSeries.PeriodType.dataPointCount, count: 5 }, { type: TimeSeries.PeriodType.now }],
            fieldFilterType: TimeSeries.IntradayFieldFilterType.miniBar,
            recordFilterType: TimeSeries.IntradayRecordFilterType.none
        });

        let numberOfIntradayBars: number = 0;
        console.log("\nIntraday results:");
        for await (const intradayBar of intradayRequestHandle) {
            if (commandLineParser.display) {
                console.log(intradayBar);
            }
            ++numberOfIntradayBars;
        }
        console.log(`Retrieved ${numberOfIntradayBars} intraday bar${1 === numberOfIntradayBars ? `` : `s`}.`);

        contentGatewayClient.disconnect();
    } catch (error) {
        console.log(error);
    }

    process.exit();
})();
