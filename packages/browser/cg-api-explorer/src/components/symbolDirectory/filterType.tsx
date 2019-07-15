/*
 * SymbolDirectory "filter type" component.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ButtonGroup from "react-bootstrap/ButtonGroup";
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
    // NB I can't get <ToggleButtonGroup> working; it doesn't seem to accept undefined as a radio value.
    // So using <ButtonGroup toggle> and "manual" checked management. Not much in it really.
    render() {
        return (
            <ButtonGroup toggle vertical className="btn-block" onChange={this.onChange}>
                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={undefined}
                    checked={this.props.filterType == null}
                >
                    None
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={SymbolDirectory.FilterType[SymbolDirectory.FilterType.includeEntityTypes]}
                    checked={this.props.filterType === SymbolDirectory.FilterType.includeEntityTypes}
                >
                    Include entity types
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={SymbolDirectory.FilterType[SymbolDirectory.FilterType.excludeEntityTypes]}
                    checked={this.props.filterType === SymbolDirectory.FilterType.excludeEntityTypes}
                >
                    Exclude entity types
                </ToggleButton>
            </ButtonGroup>
        );
    }

    private readonly onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const filterType = SymbolDirectory.FilterType[e.target.value as keyof typeof SymbolDirectory.FilterType];

        this.props.onChange({ filterType });
    };

    private readonly id = uuid();
}
