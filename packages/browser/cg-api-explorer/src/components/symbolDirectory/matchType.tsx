/*
 * SymbolDirectory "match type" component.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import uuid from "uuid/v4";

import { SymbolDirectory } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
interface LiftedState {
    matchType: SymbolDirectory.MatchType;
}

// Own props.
interface OwnProps {
    size?: "sm" | "lg";
    variant?: string;
    onChange: (newState: Partial<LiftedState>) => void;
}

// All props.
type Props = OwnProps & LiftedState;

export default class extends React.PureComponent<Props> {
    render() {
        return (
            <ToggleButtonGroup
                toggle
                vertical
                type="radio"
                className="btn-block"
                name={this.id}
                value={this.props.matchType}
                onChange={this.onChange}
            >
                <ToggleButton variant={this.props.variant} size={this.props.size} value={SymbolDirectory.MatchType.any}>
                    Any
                </ToggleButton>

                <ToggleButton variant={this.props.variant} size={this.props.size} value={SymbolDirectory.MatchType.exact}>
                    Exact
                </ToggleButton>
            </ToggleButtonGroup>
        );
    }

    private readonly onChange = (matchType: SymbolDirectory.MatchType) => {
        this.props.onChange({ matchType });
    };

    private readonly id = uuid();
}
