/*
 * SymbolDirectory "filter type" component.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import uuid from "uuid/v4";

import { SymbolDirectory } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
interface LiftedState {
    filterType: SymbolDirectory.FilterType;
}

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
                value={this.props.filterType}
                onChange={this.onChange}
            >
                <ToggleButton variant={this.props.variant} size={this.props.size} value={SymbolDirectory.FilterType.full}>
                    Any
                </ToggleButton>

                <ToggleButton
                    variant={this.props.variant}
                    size={this.props.size}
                    value={SymbolDirectory.FilterType.includeEntityTypes}
                >
                    Include entity types
                </ToggleButton>

                <ToggleButton
                    variant={this.props.variant}
                    size={this.props.size}
                    value={SymbolDirectory.FilterType.excludeEntityTypes}
                >
                    Exclude entity types
                </ToggleButton>
            </ToggleButtonGroup>
        );
    }

    private readonly onChange = (filterType: SymbolDirectory.FilterType) => {
        this.props.onChange({ filterType });
    };

    private readonly id = uuid();
}
