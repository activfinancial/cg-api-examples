/*
 * Stats used by various examples.
 */

import { IClient } from "@activfinancial/cg-api-common";

// ---------------------------------------------------------------------------------------------------------------------------------

export interface IExampleStats {
    subscribeTimestamp: number;
    initialResponseTimestamp: number;
    renderingCompleteTimestamp: number;
    responsesReturned: number;
    totalUpdates: number;
}

export class ExampleStats implements IExampleStats {
    subscribeTimestamp: number = performance.now();
    initialResponseTimestamp: number = this.subscribeTimestamp;
    renderingCompleteTimestamp: number = this.subscribeTimestamp;
    responsesReturned: number = 0;
    totalUpdates: number = 0;
}

export interface IExample {
    connect(apiPromise: Promise<IClient>): void;
    getStats(): IExampleStats;
}
