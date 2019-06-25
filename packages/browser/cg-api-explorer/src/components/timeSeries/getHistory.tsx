/*
 * GetHistory controls.
 */

import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { TimeSeries } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    historyFieldFilterType: TimeSeries.HistoryFieldFilterType;
}

// Own props.
interface OwnProps {
    onChange: (newState: Partial<LiftedState>) => void;
}

// All props.
type Props = OwnProps & LiftedState;

export class Component extends React.PureComponent<Props> {
    render() {
        return (
            <div>
                {/* Field filter. */}
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Field filter:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <Form.Control
                            as="select"
                            size="sm"
                            value={TimeSeries.HistoryFieldFilterType[this.props.historyFieldFilterType]}
                            onChange={this.onFieldFilterTypeChange}
                        >
                            <option value="fullBar">Full bar</option>
                            <option value="miniBar">Mini bar</option>
                        </Form.Control>
                    </Col>
                </Form.Group>
            </div>
        );
    }

    private readonly onFieldFilterTypeChange = (e: any /* TODO proper type */) => {
        const historyFieldFilterType =
            TimeSeries.HistoryFieldFilterType[e.target.value as keyof typeof TimeSeries.HistoryFieldFilterType];

        this.props.onChange({ historyFieldFilterType });
    };
}
