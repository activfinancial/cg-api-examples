/*
 * SymbolDirectory "search by" component.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import uuid from "uuid/v4";

import { FieldId } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace SearchByControl {
    // State to be lifted up and managed elsewhere.
    interface LiftedState {
        fieldId: FieldId;
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
                    value={this.props.fieldId as number}
                    onChange={this.onChange}
                >
                    <ToggleButton variant={this.props.variant} size={this.props.size} value={FieldId.FID_NAME}>
                        Name
                    </ToggleButton>

                    <ToggleButton variant={this.props.variant} size={this.props.size} value={FieldId.FID_LOCAL_CODE}>
                        Local code
                    </ToggleButton>
                </ToggleButtonGroup>
            );
        }

        private readonly onChange = (fieldId: FieldId) => {
            this.props.onChange({ fieldId });
        };

        private readonly id = uuid();
    }
} // namespace SearchByControl

export default SearchByControl;
