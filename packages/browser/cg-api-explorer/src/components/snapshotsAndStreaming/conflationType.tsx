/*
 * ConflationType radio component.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import uuid from "uuid/v4";

import { Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    conflationType?: Streaming.ConflationType;
}

// Own props.
interface OwnProps {
    size?: "sm" | "lg";
    variant?: string;
    onChange: (newState: Partial<LiftedState>) => void;
}

// All props.
type Props = OwnProps & LiftedState;

export class Component extends React.Component<Props> {
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
                    checked={this.props.conflationType == null}
                >
                    None
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={Streaming.ConflationType[Streaming.ConflationType.quote]}
                    checked={this.props.conflationType === Streaming.ConflationType.quote}
                >
                    Quote
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={Streaming.ConflationType[Streaming.ConflationType.trade]}
                    checked={this.props.conflationType === Streaming.ConflationType.trade}
                >
                    Trade
                </ToggleButton>
            </ButtonGroup>
        );
    }

    private readonly onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const conflationType = Streaming.ConflationType[e.target.value as keyof typeof Streaming.ConflationType];

        this.props.onChange({ conflationType });
    };

    private readonly id = uuid();
}
