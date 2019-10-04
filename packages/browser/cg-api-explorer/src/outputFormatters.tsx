/*
 * Utils for output formatting.
 */

import * as React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { TextDecoder } from "text-encoding";

import { padNumber } from "./utils";
import EllipsisTooltip from "./components/ellipsisTooltip";
import * as MakeRequest from "./components/makeRequest";

import { store } from "./state/store";
import {
    dispatchAdjustResponseCounter,
    dispatchAdjustUpdateCounter,
    dispatchAppendOutput,
    OutputType
} from "./state/actions/outputContainerActions";

import { formatField } from "../../../common/formatField";

import reactHtmlParse from "html-react-parser";

import {
    EntityType,
    EventType,
    FieldId,
    FieldType,
    FieldValue,
    IClient,
    IFieldData,
    MetaData,
    News,
    PermissionId,
    PermissionIdList,
    PermissionLevel,
    PermissionLevelList,
    RelationshipId,
    StatusCode,
    Streaming,
    TableNumber,
    TableType,
    TimeSeries
} from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
});

// ---------------------------------------------------------------------------------------------------------------------------------

export function formatDate(date: Date) {
    return `${timestampFormatter.format(date)}.${padNumber(date.getMilliseconds(), 3)}`;
}

// ---------------------------------------------------------------------------------------------------------------------------------

export function createHeaderTimestamp() {
    return <span className="output-timestamp">{formatDate(new Date())} </span>;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * Helper to do an array-like join() on an iterable.
 *
 * @param vector the iterable object.
 * @param delimiter for between elements.
 * @param toString optional formatter for elements.
 */
function joinIterable<T>(vector: Iterable<T>, delimiter: string, toString?: (value: T) => string) {
    let index = 0;
    let output = "";

    for (const element of vector) {
        if (index++ > 0) {
            output += delimiter;
        }

        output += toString != null ? toString(element) : element;
    }

    return output;
}

// ---------------------------------------------------------------------------------------------------------------------------------

const nameColSize = 6;
const valueColSize = 12 - nameColSize;

function getRowStyle(depth: number) {
    return {
        width: "100%",
        marginLeft: 0,
        marginRight: 0,
        borderWidth: "1px 0 0 0",
        borderStyle: "solid",
        borderColor: "#ddd"
    } as React.CSSProperties;
}

const nameColStyle: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
};

const colClasses = "pl-1 pr-1";

const valueColStyle: React.CSSProperties = {};

function getNameSpanStyle(depth: number) {
    return {
        marginLeft: `${depth * 0.5}em`
    } as React.CSSProperties;
}

// ---------------------------------------------------------------------------------------------------------------------------------

function getNewsStoryBody(client: IClient, newsSymbol: string) {
    const requestParameters = {
        query: `newssymbol=${newsSymbol}`,
        fieldIds: [FieldId.FID_HEADLINE, FieldId.FID_MAGAZINE, FieldId.FID_STORY_BODY, FieldId.FID_STORY_DATE_TIME]
    };

    MakeRequest.initiateAsyncIterable("client.news.getStories", JSON.stringify(requestParameters, null, 2), "News.IRecord", () =>
        client.news.getStories(requestParameters)
    );
}

// ---------------------------------------------------------------------------------------------------------------------------------

function getEqual(client: IClient, symbol: string) {
    const requestParameters = {
        key: symbol
    };

    MakeRequest.initiateAsyncIterable(
        "client.streaming.getEqual",
        JSON.stringify(requestParameters, null, 2),
        "Streaming.IImage",
        () => client.streaming.getEqual(requestParameters)
    );
}

// ---------------------------------------------------------------------------------------------------------------------------------

function getTableSpecification(client: IClient, tableNumber: TableNumber) {
    MakeRequest.initiate(
        "client.metaData.getTableSpecification",
        `PermissionLevel.realtime, ${tableNumber}`,
        "MetaData.ITableSpecification",
        () => client.metaData.getTableSpecification(PermissionLevel.realtime, tableNumber)
    );
}

// ---------------------------------------------------------------------------------------------------------------------------------

function getUniversalFieldHelper(client: IClient, fieldId: FieldId) {
    MakeRequest.initiate("client.metaData.getUniversalFieldHelper", `${fieldId}`, "MetaData.IUniversalFieldHelper", () =>
        client.metaData.getUniversalFieldHelper(fieldId)
    );
}

// ---------------------------------------------------------------------------------------------------------------------------------

const listDelimiter = ", ";

// ---------------------------------------------------------------------------------------------------------------------------------

interface PropertyFormatterResult {
    isNested?: boolean;
    output: React.ReactElement | React.ReactElement[] | string;
}

type PropertyFormatter = (client: IClient, value: any, depth: number) => PropertyFormatterResult;
interface PropertyFormatters {
    [propertyName: string]: PropertyFormatter;
}

// TODO how to get rid of the any? keyof T doesn't work at the callsite...
function formatEnum<T>(enumObject: T, value: any) {
    const str = enumObject[value as keyof T];

    if (str) {
        return `${str} (${value})`;
    } else {
        return `${value}`;
    }
}

const propertyFormatters = (function() {
    let propertyFormatters: PropertyFormatters = {};

    function makeTableNumberLink(client: IClient, tableNumber: TableNumber) {
        // Note using an anchor rather than a button to keep the text alignment nice in the output control.
        return (
            <a
                href="#"
                onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                    event.preventDefault();
                    getTableSpecification(client, tableNumber);
                }}
            >
                {formatEnum(TableNumber, tableNumber)}
            </a>
        );
    }

    function makeTableNumberSuffix(client: IClient, symbolId: Streaming.ISymbolId) {
        if (symbolId.hasOwnProperty("tableNumber") && symbolId.tableNumber !== TableNumber.undefined) {
            return (
                <>
                    {symbolId.symbol.length > 0 ? " in " : ""}
                    {makeTableNumberLink(client, symbolId.tableNumber)}
                </>
            );
        }

        return "";
    }

    function symbolIdNoLink(client: IClient, symbolId: Streaming.ISymbolId, depth: number) {
        return {
            output: (
                <>
                    {symbolId.symbol}
                    {makeTableNumberSuffix(client, symbolId)}
                </>
            )
        };
    }

    propertyFormatters.statusCode = (client: IClient, statusCode: StatusCode, depth: number) => ({
        output: formatEnum(StatusCode, statusCode)
    });

    propertyFormatters.symbolId = function(client: IClient, symbolId: Streaming.ISymbolId, depth: number) {
        if (symbolId.symbol.length === 0) {
            return symbolIdNoLink(client, symbolId, depth);
        }

        // Note using an anchor rather than a button to keep the text alignment nice in the output control.
        return {
            output: (
                <>
                    <a
                        href="#"
                        onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                            event.preventDefault();
                            getEqual(client, symbolId.symbol);
                        }}
                    >
                        {symbolId.symbol}
                    </a>
                    {makeTableNumberSuffix(client, symbolId)}
                </>
            )
        };
    };

    propertyFormatters.requestedKey = symbolIdNoLink;
    propertyFormatters.resolvedKey = propertyFormatters.symbolId;
    propertyFormatters.responseKey = propertyFormatters.symbolId;

    // Just because we don't want to display 48 processor names!
    propertyFormatters.processorInfoList = (client: IClient, processorInfoList: Iterable<string>, depth: number) => {
        let output = "Unknown processor";
        for (output of processorInfoList) {
            break;
        }

        return { output };
    };

    propertyFormatters.fieldType = (client: IClient, fieldType: FieldType, depth: number) => ({
        output: formatEnum(FieldType, fieldType)
    });

    propertyFormatters.fieldId = (client: IClient, fieldId: FieldId, depth: number) => {
        // Clicking on a "fieldId" property will get the UniversalFieldHelper for it.
        // Note using an anchor rather than a button to keep the text alignment nice in the output control.
        return {
            output: (
                <>
                    <a
                        href="#"
                        onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                            event.preventDefault();
                            getUniversalFieldHelper(client, fieldId);
                        }}
                    >
                        {formatEnum(FieldId, fieldId)}
                    </a>
                </>
            )
        };
    };

    propertyFormatters.eventType = (client: IClient, eventType: EventType, depth: number) => ({
        output: formatEnum(EventType, eventType)
    });

    propertyFormatters.entityType = (client: IClient, entityType: EntityType, depth: number) => ({
        output: formatEnum(EntityType, entityType)
    });

    propertyFormatters.permissionId = (client: IClient, permissionId: PermissionId, depth: number) => ({
        output: formatEnum(PermissionId, permissionId)
    });

    propertyFormatters.permissionIdList = (client: IClient, permissionIdList: PermissionIdList, depth: number) => ({
        output: joinIterable(
            permissionIdList,
            listDelimiter,
            (permissionId: PermissionId) => `${propertyFormatters.permissionId(client, permissionId, depth).output}`
        )
    });

    propertyFormatters.permissionIdType = (client: IClient, permissionIdType: MetaData.PermissionIdType, depth: number) => ({
        output: formatEnum(MetaData.PermissionIdType, permissionIdType)
    });

    propertyFormatters.permissionLevel = (client: IClient, permissionLevel: PermissionLevel, depth: number) => ({
        output: formatEnum(PermissionLevel, permissionLevel)
    });

    propertyFormatters.permissionLevelList = (client: IClient, permissionLevelList: PermissionLevelList, depth: number) => ({
        output: joinIterable(
            permissionLevelList,
            listDelimiter,
            (permissionLevel: PermissionLevel) => `${propertyFormatters.permissionLevel(client, permissionLevel, depth).output}`
        )
    });

    propertyFormatters.conflationType = (client: IClient, conflationType: Streaming.ConflationType, depth: number) => ({
        output: formatEnum(Streaming.ConflationType, conflationType)
    });

    propertyFormatters.idealConflationType = propertyFormatters.conflationType;

    propertyFormatters.dynamicConflationTrigger = (
        client: IClient,
        dynamicConflationTrigger: Streaming.DynamicConflationTrigger,
        depth: number
    ) => ({
        output: formatEnum(Streaming.DynamicConflationTrigger, dynamicConflationTrigger)
    });

    propertyFormatters.conflationTypeList = (client: IClient, conflationTypeList: Streaming.ConflationTypeList, depth: number) => ({
        output: joinIterable(
            conflationTypeList,
            listDelimiter,
            (conflationType: Streaming.ConflationType) =>
                `${propertyFormatters.conflationType(client, conflationType, depth).output}`
        )
    });

    propertyFormatters.conflationIntervalList = (client: IClient, conflationIntervalList: number[], depth: number) => ({
        output: joinIterable(conflationIntervalList, listDelimiter)
    });

    propertyFormatters.relationshipId = (client: IClient, relationshipId: RelationshipId, depth: number) => ({
        output: formatEnum(RelationshipId, relationshipId)
    });

    propertyFormatters.tableNumber = (client: IClient, tableNumber: TableNumber, depth: number) => {
        // Clicking a "tableNumber" entry gets the table spec.
        return {
            output: makeTableNumberLink(client, tableNumber)
        };
    };

    propertyFormatters.tableType = (client: IClient, tableType: TableType, depth: number) => ({
        output: formatEnum(TableType, tableType)
    });

    propertyFormatters.tickType = (client: IClient, tickType: TimeSeries.TickType, depth: number) => ({
        output: formatEnum(TimeSeries.TickType, tickType)
    });

    propertyFormatters.newsSymbol = (client: IClient, newsSymbol: string, depth: number) => {
        // Clicking news symbol gets the story body.
        // Note using an anchor rather than a button to keep the text alignment nice in the output control.
        return {
            output: (
                <a
                    href="#"
                    onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                        event.preventDefault();
                        getNewsStoryBody(client, newsSymbol);
                    }}
                >
                    {newsSymbol}
                </a>
            )
        };
    };

    propertyFormatters.fieldData = (client: IClient, fieldData: IFieldData, depth: number) => {
        // The big one. Format field data nicely.

        const rowStyle = getRowStyle(depth + 1);
        const nameSpanStyle = getNameSpanStyle(depth + 1);
        let output: React.ReactElement[] = [];

        for (const field of fieldData) {
            let fieldValue: FieldValue | null | React.ReactElement | React.ReactElement[] = field.value;

            // Special case some (likely to be) HTML fields.
            switch (field.id) {
                case FieldId.FID_STORY_BODY:
                    fieldValue = new TextDecoder("utf-8").decode(fieldValue as Uint8Array);

                // NB fall-through.

                case FieldId.FID_HEADLINE:
                    fieldValue = reactHtmlParse(fieldValue as string);
                    break;

                default:
                    fieldValue = formatField(field, { undefinedText: "---", showTrending: true });
                    break;
            }

            output.push(
                <Row style={rowStyle} className="output-row">
                    <Col xs={nameColSize} style={nameColStyle} className={colClasses}>
                        <EllipsisTooltip>
                            <span style={nameSpanStyle}>{propertyFormatters.fieldId(client, field.id, depth).output}</span>
                        </EllipsisTooltip>
                    </Col>
                    <Col xs={valueColSize} style={valueColStyle} className={colClasses}>
                        {fieldValue}
                    </Col>
                </Row>
            );
        }

        return {
            isNested: true,
            output
        };
    };

    return propertyFormatters;
})();

// ---------------------------------------------------------------------------------------------------------------------------------

function mightBeEmbindVector(object: any) {
    // TODO should probably beef this up! size() and get() aren't particularly unique...
    return typeof object.size === "function" && typeof object.get === "function";
}

// ---------------------------------------------------------------------------------------------------------------------------------

function renderEmbindVector<T>(client: IClient, object: Iterable<T>, depth: number) {
    let elements: React.ReactElement[] = [];

    // embind vectors.
    let i = 0;
    for (const value of object) {
        // TODO output-timestamp is a bit poo.
        renderProperty(elements, client, `[${i}]`, "output-timestamp", value, depth);
        ++i;
    }

    return elements;
}

// ---------------------------------------------------------------------------------------------------------------------------------

function renderArray(client: IClient, object: any[], depth: number) {
    let elements: React.ReactElement[] = [];

    for (let i = 0; i < object.length; ++i) {
        // TODO output-timestamp is a bit poo.
        renderProperty(elements, client, `[${i}]`, "output-timestamp", object[i], depth);
    }

    return elements;
}

// ---------------------------------------------------------------------------------------------------------------------------------

export function renderObject(client: IClient, objectName: string, messageObject: any): React.ReactElement[] {
    let elements: React.ReactElement[] = [];

    // TODO output-timestamp is a bit poo.
    renderProperty(elements, client, objectName, "output-timestamp", messageObject, 0);

    return elements;
}

// ---------------------------------------------------------------------------------------------------------------------------------

function renderProperty(
    elements: React.ReactElement[],
    client: IClient,
    propertyName: string,
    propertyNameClassList: string,
    propertyValue: any,
    depth: number
) {
    if (typeof propertyValue === "function") {
        return;
    }

    let propertyNameSuffix = "";
    let renderNested = false;

    if (typeof propertyValue === "undefined") {
        propertyValue = "---";
    } else if (propertyValue == null) {
        propertyValue = "null";
    } else if (propertyName in propertyFormatters) {
        // Some property names have formatting helpers, so prefer those if available.
        const { isNested, output } = propertyFormatters[propertyName](client, propertyValue, depth);
        renderNested = !!isNested;
        propertyValue = output;
    } else if (typeof propertyValue === "object") {
        // Check array first as Array.toString is different than Object.toString, and will hit the next clause.
        if (Array.isArray(propertyValue)) {
            renderNested = true;
            propertyValue = renderArray(client, propertyValue, depth + 1);
        } else if (Object.getPrototypeOf(propertyValue).toString !== Object.prototype.toString) {
            // It has a custom toString() function, so use it.
            propertyValue = propertyValue.toString();
        } else if (mightBeEmbindVector(propertyValue)) {
            // Embind vector.
            renderNested = true;
            propertyValue = renderEmbindVector(client, propertyValue, depth + 1);
            // TODO embind maps?
        } else {
            // Just iterate through property names.
            renderNested = true;
            let nestedElements: React.ReactElement[] = [];

            for (const propertyName in propertyValue) {
                renderProperty(nestedElements, client, propertyName, "", propertyValue[propertyName], depth + 1);
            }

            propertyValue = nestedElements;
            propertyNameSuffix = propertyNameClassList === "" ? "." : "";
        }
    } else {
        // Simple case of strings, numbers, bools, etc.
        propertyValue = propertyValue.toString();
    }

    const rowStyle = getRowStyle(depth);
    const nameSpanStyle = getNameSpanStyle(depth);
    const renderPropertyName = `${propertyName}${propertyNameSuffix}`;
    const propertyNameClasses = `${colClasses} ${propertyNameClassList}`;

    if (renderNested) {
        // Render as a nested object.
        elements.push(
            <>
                <Row style={rowStyle} className="output-row">
                    <Col xs={nameColSize} style={nameColStyle} className={propertyNameClasses}>
                        <span style={nameSpanStyle}>{renderPropertyName}</span>
                    </Col>
                </Row>
                {propertyValue}
            </>
        );
    } else {
        // Just render in second column.
        elements.push(
            <Row style={rowStyle} className="output-row">
                <Col xs={nameColSize} style={nameColStyle} className={propertyNameClasses}>
                    <span style={nameSpanStyle}>{renderPropertyName}</span>
                </Col>
                <Col xs={valueColSize} style={valueColStyle} className={colClasses}>
                    {propertyValue}
                </Col>
            </Row>
        );
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Render all records from iterating a requestHandle. */
export async function renderAsyncIterableResponse<T extends AsyncIterable<any>>(
    requestName: string,
    recordTypeName: string,
    startTimestamp: number,
    requestHandle: T
) {
    let numberOfRecords = 0;

    // Asynchronously iterate all response records.
    for await (const record of requestHandle) {
        ++numberOfRecords;

        store.dispatch(
            dispatchAppendOutput(
                OutputType.response,
                <div>
                    <div>
                        {createHeaderTimestamp()}
                        {requestName}() response {numberOfRecords}:
                    </div>
                    {renderObject(store.getState().root.client!, recordTypeName, record)}
                </div>
            )
        );
    }
    const elapsedTime = performance.now() - startTimestamp;

    store.dispatch(
        dispatchAppendOutput(
            OutputType.always,
            <div>
                {createHeaderTimestamp()}
                {requestName}() returned {numberOfRecords} record{1 === numberOfRecords ? "" : "s"} in {elapsedTime.toFixed()}ms;{" "}
                {((numberOfRecords * 1000) / elapsedTime).toFixed(1)} / sec
            </div>
        )
    );

    // Update the display with number of responses and drop the pending request count.
    if (numberOfRecords > 0) {
        store.dispatch(dispatchAdjustResponseCounter(numberOfRecords));
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Render a response from a request. */
export async function renderResponse(requestName: string, recordTypeName: string, startTimestamp: number, response: any) {
    const elapsedTime = performance.now() - startTimestamp;

    store.dispatch(
        dispatchAppendOutput(
            OutputType.response,
            <div>
                <div>
                    {createHeaderTimestamp()}
                    {requestName}() response in {elapsedTime.toFixed()}ms:
                </div>
                {renderObject(store.getState().root.client!, recordTypeName, response)}
            </div>
        )
    );

    store.dispatch(dispatchAdjustResponseCounter(1));
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Render an error from a request. */
export async function renderError(requestName: string, error: Error) {
    store.dispatch(
        dispatchAppendOutput(
            OutputType.always,
            <div>
                {createHeaderTimestamp()}
                {requestName}() response: {error.toString()}
            </div>
        )
    );
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Render an update. */
export function renderUpdate(client: IClient, updateTypeName: string, key: string, update: Streaming.IUpdate | News.IUpdate) {
    store.dispatch(
        dispatchAppendOutput(
            OutputType.update,
            <div>
                <div>
                    {createHeaderTimestamp()}
                    Update received for {key}:
                </div>
                {renderObject(client, updateTypeName, update)}
            </div>
        )
    );

    store.dispatch(dispatchAdjustUpdateCounter(1));
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Render a DynamicConflationInfo. */
export function renderDynamicConflationInfo(client: IClient, dynamicConflationInfo: Streaming.IDynamicConflationInfo) {
    store.dispatch(
        dispatchAppendOutput(
            OutputType.always,
            <>
                {createHeaderTimestamp()}Dynamic conflation update:
                <div>{renderObject(client, "DynamicConflationInfo", dynamicConflationInfo)}</div>
            </>
        )
    );
}
