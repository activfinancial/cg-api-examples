/*
 * RelationshipIdControl.
 */

import * as React from "react";
import Form from "react-bootstrap/Form";
import uuid from "uuid/v4";
import { $enum } from "ts-enum-util";

import { getEnumValueFromKeyOrInteger } from "../../utils";

import { RelationshipId } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// A list of <option> elements for the input.
const relationshipIdOptionList = $enum(RelationshipId).map((value, key) => <option value={key} key={key} />);

// ---------------------------------------------------------------------------------------------------------------------------------

interface Props {
    relationshipId?: RelationshipId;
    onChange: (relationshipId?: RelationshipId) => void;
}

interface State {
    str: string;
    relationshipId?: RelationshipId;
}

class Component extends React.PureComponent<Props, State> {
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
                    placeholder="Relationship id"
                    list={this.id}
                    value={this.state.str}
                    onChange={this.onChange}
                    onBlur={this.onBlur}
                />
                <datalist id={this.id}>{relationshipIdOptionList}</datalist>
            </div>
        );
    }

    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.relationshipId !== state.relationshipId) {
            return Component.getStateFromProps(props);
        }

        return null;
    }

    private static getStateFromProps(props: Props) {
        return {
            str: Component.relationshipIdToString(props.relationshipId),
            relationshipId: props.relationshipId
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
        const relationshipId = Component.stringToRelationshipId(this.state.str);

        if (relationshipId !== this.state.relationshipId) {
            // Id has changed; pass up.
            this.props.onChange(relationshipId);
        } else {
            const str = Component.relationshipIdToString(relationshipId);
            if (str !== this.state.str) {
                // Id hasn't changed (nothing to pass up), but we need to reset the string representation.
                this.setState({ str });
            }
        }
    }

    private static relationshipIdToString(relationshipId?: RelationshipId): string {
        if (relationshipId == null) {
            return "";
        }

        const str = RelationshipId[relationshipId];
        return typeof str === "undefined" ? relationshipId.toString() : str;
    }

    private static stringToRelationshipId(str: string) {
        if (str.length === 0) {
            return undefined;
        }

        return getEnumValueFromKeyOrInteger(str, RelationshipId, RelationshipId.none, { allowAnyInteger: true });
    }

    private readonly id = uuid();
}

export default Component;
