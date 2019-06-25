/*
 * Event types control. Handles delimiting and generates an array of EventType.
 */

import * as React from "react";
import Textarea from "react-textarea-autosize";

import { getEnumValueFromKeyOrInteger } from "../../utils";

import { EventType } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    eventTypes: EventType[];
}

// Own props.
interface OwnProps {
    required?: boolean;
    onChange: (newState: Partial<LiftedState>) => void;
}

// All props.
type Props = OwnProps & LiftedState;

// Internal state.
interface State {
    str: string;
    eventTypes: EventType[];
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
                placeholder="Event type per line"
                required={this.props.required}
                maxRows={10}
                value={this.state.str}
                onChange={this.onChange}
                onBlur={this.onBlur}
            />
        );
    }

    // React lifecycle method to update internal state from props change.
    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.eventTypes !== state.eventTypes) {
            return Component.getStateFromProps(props);
        }

        return null;
    }

    private static getStateFromProps(props: Props) {
        return {
            str: Component.eventTypesToString(props.eventTypes),
            eventTypes: props.eventTypes
        };
    }

    private readonly onChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const str = e.target.value;
        this.setState({ str });
    };

    private readonly onBlur = () => this.processInput();

    private processInput() {
        // Normalize input: remove whitespace and empty or invalid event types.
        const strs = this.state.str.split(Component.delimiter);
        let eventTypes: EventType[] = [];

        for (const str of strs) {
            const trimmedStr = str.trim();
            if (trimmedStr.length > 0) {
                const eventType = Component.stringToEventType(trimmedStr);
                if (eventType != null) {
                    eventTypes.push(eventType);
                }
            }
        }

        // Pass new eventTypes to parent. No need to update our eventTypes state; getDerivedStateFromProps() will handle it.
        this.props.onChange({ eventTypes });
    }

    private static eventTypesToString(eventTypes: EventType[]) {
        // NB we'll only do validation on user input; we should display whatever the prop we were passed is.
        return eventTypes.reduce<string>(
            (acc, eventType) => `${acc}${acc.length ? Component.delimiter : ""}${Component.eventTypeToString(eventType)}`,
            ""
        );
    }

    private static eventTypeToString(eventType: EventType): string {
        const str = EventType[eventType];
        return typeof str === "undefined" ? eventType.toString() : str;
    }

    private static stringToEventType(str: string) {
        return getEnumValueFromKeyOrInteger(str, EventType, undefined, { allowAnyInteger: true });
    }

    static readonly delimiter = "\n";
}
