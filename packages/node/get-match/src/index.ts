/*
 * Simple node getMatch sample.
 */

import { connect, FieldId, Streaming, StatusCode } from "@activfinancial/cg-api";
import commander from "commander";
import { sprintf } from "sprintf-js";

// ---------------------------------------------------------------------------------------------------------------------------------

import { version, description } from "../package.json";

const commandLineParser = commander
    .version(version)
    .description(description)
    .option("--url [url]", "ContentGateway URL", "ams://cg-ny4-web.activfinancial.com/ContentGateway:Service")
    .option("--userId <userId>", "user id")
    .option("--password <password>", "password")
    .option("--symbol <symbol>", "symbol", "MSFT")
    .option("--relationship <relationship>", "relationship", "none")
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

        const requestHandle = contentGatewayClient.streaming.getMatch({
            key: commandLineParser.symbol,
            matchType: Streaming.GetMatchType.composite,
            relationships: {
                [commandLineParser.relationship]: {
                    /* Empty Relationship will get all fields. */
                }
            }
        });

        let numberOfRecords: number = 0;

        // Asynchronously iterate records.
        for await (const record of requestHandle) {
            ++numberOfRecords;

            if (StatusCode.success !== record.statusCode) {
                console.log(`Error: ${StatusCode[record.statusCode]}`);
            } else if (commandLineParser.display) {
                console.log(`\n${record.responseKey.symbol} fields:`);

                for (const field of record.fieldData) {
                    console.log(
                        sprintf(
                            "%-50.50s %s",
                            FieldId[field.id] || field.id,
                            field.statusCode === StatusCode.success ? field.value : StatusCode[field.statusCode]
                        )
                    );
                }
            }
        }

        console.log(`\nRetrieved ${numberOfRecords} record${1 === numberOfRecords ? `` : `s`}.`);

        contentGatewayClient.disconnect();
    } catch (error) {
        console.log(error);
    }

    process.exit();
})();
