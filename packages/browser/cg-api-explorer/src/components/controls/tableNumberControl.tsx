/*
 * TableNumberControl.
 */

import * as React from "react";
import Form from "react-bootstrap/Form";
import uuid from "uuid/v4";
import { $enum } from "ts-enum-util";

import { getEnumValueFromKeyOrInteger } from "../../utils";

import { TableNumber } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// A list of <option> elements for the input.
const tableNumberOptionList = $enum(TableNumber).map((value, key) => <option value={key} key={key} />);

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    tableNumber?: TableNumber;
}

// Own props.
interface OwnProps {
    placeholder?: string;
    required?: boolean;
    onChange: (newState: Partial<LiftedState>) => void;
}

// All props.
type Props = OwnProps & LiftedState;

// Internal state.
interface State {
    str: string;
    tableNumber?: TableNumber;
}

export class Component extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = Component.getStateFromProps(this.props);
    }

    render() {
        return (
            <div>
                <Form.Control
                    type="text"
                    size="sm"
                    placeholder={this.props.placeholder ? this.props.placeholder : "Table name or number"}
                    required={this.props.required}
                    list={this.id}
                    value={this.state.str}
                    onChange={this.onChange}
                    onBlur={this.onBlur}
                />
                <datalist id={this.id}>{tableNumberOptionList}</datalist>
            </div>
        );
    }

    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.tableNumber !== state.tableNumber) {
            return Component.getStateFromProps(props);
        }

        return null;
    }

    private static getStateFromProps(props: Props) {
        return {
            str: Component.tableNumberToString(props.tableNumber),
            tableNumber: props.tableNumber
        };
    }

    private readonly onChange = (e: any /* TODO proper type */) => {
        const str = e.target.value;
        this.setState({ str });
    };

    private readonly onBlur = () => {
        this.processInput();
    };

    private processInput() {
        const tableNumber = Component.stringToTableNumber(this.state.str);

        if (tableNumber !== this.state.tableNumber) {
            // Id has changed; pass up.
            this.props.onChange({ tableNumber });
        } else {
            const str = Component.tableNumberToString(tableNumber);
            if (str !== this.state.str) {
                // Id hasn't changed (nothing to pass up), but we need to reset the string representation.
                this.setState({ str });
            }
        }
    }

    private static tableNumberToString(tableNumber?: TableNumber): string {
        if (tableNumber == null) {
            return "";
        }

        const str = TableNumber[tableNumber];
        return typeof str === "undefined" ? tableNumber.toString() : str;
    }

    private static stringToTableNumber(str: string) {
        if (str.length === 0) {
            return undefined;
        }

        return getEnumValueFromKeyOrInteger(str, TableNumber, undefined, { allowAnyInteger: true });
    }

    private readonly id = uuid();
}
