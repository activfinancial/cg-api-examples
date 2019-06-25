/*
 * Field ids control. Handles delimiting and generates an array of FieldId.
 */

import * as React from "react";
import Textarea from "react-textarea-autosize";

import { getEnumValueFromKeyOrInteger } from "../../utils";

import { FieldId } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    fieldIds: FieldId[];
}

// Own props.
interface OwnProps {
    disabled?: boolean;
    placeholder?: string;
    onChange: (newState: Partial<LiftedState>) => void;
}

// All props.
type Props = OwnProps & LiftedState;

// Internal state.
interface State {
    str: string;
    fieldIds: FieldId[];
}

export class Component extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = Component.getStateFromProps(this.props);
    }

    render() {
        return (
            <Textarea
                className="form-control form-control-sm textarea-autosize"
                wrap="off"
                placeholder={this.props.placeholder ? this.props.placeholder : "Field id per line"}
                disabled={this.props.disabled}
                maxRows={10}
                value={this.state.str}
                onChange={this.onChange}
                onBlur={this.onBlur}
            />
        );
    }

    // React lifecycle method to update internal state from props change.
    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.fieldIds !== state.fieldIds) {
            return Component.getStateFromProps(props);
        }

        return null;
    }

    private static getStateFromProps(props: Props) {
        return {
            str: Component.fieldIdsToString(props.fieldIds),
            fieldIds: props.fieldIds
        };
    }

    private readonly onChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const str = e.target.value;
        this.setState({ str });
    };

    private readonly onBlur = () => this.processInput();

    private processInput() {
        // Normalize input: remove whitespace and empty or invalid field ids.
        const strs = this.state.str.split(Component.delimiter);
        let fieldIds: FieldId[] = [];

        for (const str of strs) {
            const trimmedStr = str.trim();
            if (trimmedStr.length > 0) {
                const fieldId = Component.stringToFieldId(trimmedStr);
                if (fieldId != null) {
                    fieldIds.push(fieldId);
                }
            }
        }

        // Pass new fieldIds to parent. No need to update our fieldIds state; getDerivedStateFromProps() will handle it.
        this.props.onChange({ fieldIds });
    }

    private static fieldIdsToString(fieldIds: FieldId[]) {
        // NB we'll only do validation on user input; we should display whatever the prop we were passed is.
        return fieldIds.reduce<string>(
            (acc, fieldId) => `${acc}${acc.length ? Component.delimiter : ""}${Component.fieldIdToString(fieldId)}`,
            ""
        );
    }

    private static fieldIdToString(fieldId: FieldId): string {
        const str = FieldId[fieldId];
        return typeof str === "undefined" ? fieldId.toString() : str;
    }

    private static stringToFieldId(str: string) {
        return getEnumValueFromKeyOrInteger(str, FieldId, undefined, {
            allowAnyInteger: true,
            prefix: "FID_",
            tryUpperCase: true
        });
    }

    static readonly delimiter = "\n";
}
