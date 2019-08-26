/*
 * Entity types control. Handles delimiting and generates an array of EntityType.
 */

// TODO template this with EventTypesControl...

import * as React from "react";
import Textarea from "react-textarea-autosize";

import { getEnumValueFromKeyOrInteger } from "../../utils";

import { EntityType } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    entityTypes: EntityType | EntityType[];
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
    entityTypes: EntityType[];
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
                placeholder="Entity type per line"
                maxRows={10}
                value={this.state.str}
                required={this.props.required}
                onChange={this.onChange}
                onBlur={this.onBlur}
            />
        );
    }

    // React lifecycle method to update internal state from props change.
    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.entityTypes !== state.entityTypes) {
            return Component.getStateFromProps(props);
        }

        return null;
    }

    private static getStateFromProps(props: Props) {
        return {
            str: Component.entityTypesToString(props.entityTypes),
            entityTypes: props.entityTypes instanceof Array ? props.entityTypes : [props.entityTypes]
        };
    }

    private readonly onChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const str = e.target.value;
        this.setState({ str });
    };

    private readonly onBlur = () => this.processInput();

    private processInput() {
        // Normalize input: remove whitespace and empty or invalid entity types.
        const strs = this.state.str.split(Component.delimiter);
        let entityTypes: EntityType[] = [];

        for (const str of strs) {
            const trimmedStr = str.trim();
            if (trimmedStr.length > 0) {
                const entityType = Component.stringToEntityType(trimmedStr);
                if (entityType != null) {
                    entityTypes.push(entityType);
                }
            }
        }

        // Pass new entityTypes to parent. No need to update our entityTypes state; getDerivedStateFromProps() will handle it.
        this.props.onChange({ entityTypes });
    }

    private static entityTypesToString(entityTypes: EntityType | EntityType[]) {
        if (entityTypes instanceof Array) {
            // NB we'll only do validation on user input; we should display whatever the prop we were passed is.
            return entityTypes.reduce<string>(
                (acc, entityType) => `${acc}${acc.length ? Component.delimiter : ""}${Component.entityTypeToString(entityType)}`,
                ""
            );
        } else {
            return Component.entityTypeToString(entityTypes);
        }
    }

    private static entityTypeToString(entityType: EntityType): string {
        const str = EntityType[entityType];
        return typeof str === "undefined" ? entityType.toString() : str;
    }

    private static stringToEntityType(str: string) {
        return getEnumValueFromKeyOrInteger(str, EntityType, undefined, { allowAnyInteger: true });
    }

    static readonly delimiter = "\n";
}
