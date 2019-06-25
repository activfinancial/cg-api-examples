/*
 * Subscription type radio component.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import uuid from "uuid/v4";

import { Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
interface LiftedState {
    subscriptionType?: Streaming.SubscriptionType;
}

// Own props.
interface OwnProps {
    size?: "sm" | "lg";
    variant?: string;
    onChange: (newState: Partial<LiftedState>) => void;
}

// All props.
type Props = OwnProps & LiftedState;

export default class extends React.Component<Props> {
    render() {
        return (
            <ButtonGroup toggle vertical className="btn-block" onChange={this.onChange}>
                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={undefined}
                    checked={!this.props.subscriptionType}
                >
                    None
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={Streaming.SubscriptionType[Streaming.SubscriptionType.addOrDelete]}
                    checked={this.props.subscriptionType === Streaming.SubscriptionType.addOrDelete}
                >
                    Adds or deletes
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={Streaming.SubscriptionType[Streaming.SubscriptionType.eventTypeFilterIncludeList]}
                    checked={this.props.subscriptionType === Streaming.SubscriptionType.eventTypeFilterIncludeList}
                >
                    Include event types
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={Streaming.SubscriptionType[Streaming.SubscriptionType.eventTypeFilterExcludeList]}
                    checked={this.props.subscriptionType === Streaming.SubscriptionType.eventTypeFilterExcludeList}
                >
                    Exclude event types
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={Streaming.SubscriptionType[Streaming.SubscriptionType.full]}
                    checked={this.props.subscriptionType === Streaming.SubscriptionType.full}
                >
                    Full
                </ToggleButton>
            </ButtonGroup>
        );
    }

    private readonly onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const subscriptionType = Streaming.SubscriptionType[e.target.value as keyof typeof Streaming.SubscriptionType];

        this.props.onChange({ subscriptionType });
    };

    private readonly id = uuid();
}
