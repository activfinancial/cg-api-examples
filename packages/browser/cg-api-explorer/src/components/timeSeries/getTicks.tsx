/*
 * GetTicks controls.
 */

import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { TimeSeries } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    tickRecordFilterType: TimeSeries.TickRecordFilterType;
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
            <Form.Group as={Form.Row} className="form-group-margin">
                <Form.Label column className={`${labelColumnClass} text-right`}>
                    Record filter:
                </Form.Label>
                <Col sm={inputColumnWidth}>
                    <Form.Control
                        as="select"
                        size="sm"
                        value={TimeSeries.TickRecordFilterType[this.props.tickRecordFilterType]}
                        onChange={this.onTickRecordFilterTypeChange}
                    >
                        <option value="none">No filtering</option>
                        <option value="trades">Trades</option>
                        <option value="regularTrades">Regular trades</option>
                        <option value="nonRegularTrades">Non-regular trades</option>
                        <option value="tradeCancelsCorrections">Trade cancels and corrections</option>
                        <option value="tradesCancelsCorrections">Trades, cancels and corrections</option>
                        <option value="quotes">Quotes (bids and asks)</option>
                        <option value="bids">Quotes (bids only)</option>
                        <option value="asks">Quotes (asks only)</option>
                        <option value="quotesTrades">Quotes and trades</option>
                        <option value="info">Limit up/down and trade status</option>
                    </Form.Control>
                </Col>
            </Form.Group>
        );
    }

    private readonly onTickRecordFilterTypeChange = (e: any /* TODO proper type */) => {
        const tickRecordFilterType =
            TimeSeries.TickRecordFilterType[e.target.value as keyof typeof TimeSeries.TickRecordFilterType];

        this.props.onChange({ tickRecordFilterType });
    };
}
