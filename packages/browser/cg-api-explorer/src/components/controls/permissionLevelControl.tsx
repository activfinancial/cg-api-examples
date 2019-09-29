/*
 * Permission level radio control.
 */

import * as React from "react";
import { ButtonProps } from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ToggleButton from "react-bootstrap/ToggleButton";
import uuid from "uuid/v4";

import { PermissionLevel } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up elsewhere.
export interface LiftedState {
    permissionLevel?: PermissionLevel;
}

interface OwnProps extends Pick<ButtonProps, "size" | "variant"> {
    disableBest?: boolean;
    onChange: (permissionLevel?: PermissionLevel) => void;
}

// All props.
type Props = OwnProps & LiftedState;

export class Component extends React.PureComponent<Props> {
    // NB I can't get <ToggleButtonGroup> working; it doesn't seem to accept undefined as a radio value.
    // So using <ButtonGroup toggle> and "manual" checked management. Not much in it really.
    render() {
        return (
            <ButtonGroup toggle vertical className="btn-block" onChange={this.onChange}>
                {!this.props.disableBest && (
                    <ToggleButton
                        type="radio"
                        variant={this.props.variant}
                        size={this.props.size}
                        name={this.id}
                        value={undefined}
                        checked={this.props.permissionLevel == null}
                    >
                        Best allowed
                    </ToggleButton>
                )}

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={PermissionLevel[PermissionLevel.realtime]}
                    checked={this.props.permissionLevel === PermissionLevel.realtime}
                >
                    Realtime
                </ToggleButton>

                <ToggleButton
                    type="radio"
                    variant={this.props.variant}
                    size={this.props.size}
                    name={this.id}
                    value={PermissionLevel[PermissionLevel.delayed]}
                    checked={this.props.permissionLevel === PermissionLevel.delayed}
                >
                    Delayed
                </ToggleButton>
            </ButtonGroup>
        );
    }

    private readonly onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const permissionLevel = PermissionLevel[e.target.value as keyof typeof PermissionLevel];

        this.props.onChange(permissionLevel);
    };

    private readonly id = uuid();
}
