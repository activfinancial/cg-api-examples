/*
 * Field formatting helpers.
 */

import { FieldType, IField, Rational, StatusCode, TRational } from "@activfinancial/cg-api";

import { sprintf } from "sprintf-js";
import { TextDecoder } from "text-encoding";

// ---------------------------------------------------------------------------------------------------------------------------------

const textDecoder = new TextDecoder("ascii", { fatal: true });

/** Pretty up a Uint8Array field with ASCII and hex dump. */
function formatUint8Array(value: Uint8Array) {
    let isPrintable = true;
    let hex = "";

    // NB this used to use [...value].map() but that has started failing when hosted in the website and not
    // creating a regular array at all...
    value.forEach((chr) => {
        // HACK can't find a 7-bit encoding type and Chrome won't error in TextDecoder like Firefox so ends up printing garbage.
        if (chr < 32 || chr >= 127) {
            isPrintable = false;
        }

        if (hex.length !== 0) {
            hex += " ";
        }

        hex += sprintf("%02x", chr);
    });

    try {
        if (isPrintable) {
            return `"${textDecoder.decode(value)}" (hex: ${hex})`;
        }
    } catch {}

    return `hex: ${hex}`;
}

// ---------------------------------------------------------------------------------------------------------------------------------

const rationalNumberFormat = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 9
});

// ---------------------------------------------------------------------------------------------------------------------------------

/** Relaxed Intl.NumberFormat interface we can override. */
export interface NumberFormat {
    format(value: number): string;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Options for formatField(). */
export interface FormatFieldOptions {
    /** Text to show for undefined fields. Default is an empty string. */
    undefinedText?: string;

    /** Whether TRational fields should show trending info. Default is no. */
    showTrending?: boolean;

    /** Formatter for rational numbers. */
    rationalNumberFormat?: NumberFormat;
}

/** Format up a Field's value (that may be null) as a string. */
export function formatField(field: IField, options: FormatFieldOptions = {}): string {
    switch (field.statusCode) {
        case StatusCode.success:
            break;

        case StatusCode.undefinedField:
            // field.value == null.
            return options.undefinedText || "";

        default:
            return StatusCode[field.statusCode] || `unknown field status ${field.statusCode}`;
    }

    const thisRationalNumberFormat = options.rationalNumberFormat || rationalNumberFormat;

    switch (field.type) {
        case FieldType.tRational:
            if (options.showTrending) {
                return `${thisRationalNumberFormat.format(
                    (field.value as TRational).valueOf()
                )} ${(field.value as TRational).trendingToString()}`;
            }

        // NB fall-through.

        case FieldType.rational:
            return thisRationalNumberFormat.format((field.value as Rational).valueOf());

        case FieldType.uInt:
        case FieldType.sInt:
        case FieldType.date:
        case FieldType.time:
        case FieldType.dateTime:
            return field.value!.toLocaleString();

        case FieldType.binaryArray:
        case FieldType.binaryString:
        case FieldType.blob:
        case FieldType.crcBlob:
            return formatUint8Array(field.value as Uint8Array);

        case FieldType.textArray:
        case FieldType.textString:
            return field.value as string;

        case FieldType.boolean:
            return field.value!.toString();

        default:
            break;
    }

    // NB never reached.
    return String(field.value!);
}
