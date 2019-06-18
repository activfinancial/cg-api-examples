/*
 * AliasMode radio component.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import uuid from "uuid/v4";

import { Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace AliasModeControl {
    // State to be lifted up and managed elsewhere.
    interface LiftedState {
        aliasMode: Streaming.AliasMode;
    }

    // Own props.
    interface OwnProps {
        size?: "sm" | "lg";
        variant?: string;
        onChange: (newState: Partial<LiftedState>) => void;
    }

    // All props.
    type Props = OwnProps & LiftedState;

    export class Component extends React.PureComponent<Props> {
        render() {
            return (
                <ToggleButtonGroup
                    toggle
                    vertical
                    type="radio"
                    className="btn-block"
                    name={this.id}
                    value={this.props.aliasMode}
                    onChange={this.onChange}
                >
                    <ToggleButton variant={this.props.variant} size={this.props.size} value={Streaming.AliasMode.normal}>
                        Response key will be target of alias
                    </ToggleButton>

                    <ToggleButton variant={this.props.variant} size={this.props.size} value={Streaming.AliasMode.useAliasKey}>
                        Response key will be alias's key
                    </ToggleButton>

                    <ToggleButton variant={this.props.variant} size={this.props.size} value={Streaming.AliasMode.dontResolve}>
                        Retrieve alias record rather than target of alias
                    </ToggleButton>
                </ToggleButtonGroup>
            );
        }

        private readonly onChange = (aliasMode: Streaming.AliasMode) => {
            this.props.onChange({ aliasMode });
        };

        private readonly id = uuid();
    }
} // namespace AliasModeControl

export default AliasModeControl;
