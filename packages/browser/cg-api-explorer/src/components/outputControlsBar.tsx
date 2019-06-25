/*
 * Control bar for top of output display.
 */

import * as React from "react";
import { connect } from "react-redux";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import SimpleTooltip from "./simpleTooltip";
import PlayPauseCountControl from "./controls/playPauseCountControl";

import { AppState } from "../state/store";
import {
    dispatchToggleDisplayRequests,
    dispatchToggleDisplayResponses,
    dispatchToggleDisplayUpdates,
    dispatchClearOutput
} from "../state/actions/outputContainerActions";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up elsewhere (redux in our case).
export interface LiftedState {
    numberOfResponses: number;
    numberOfUpdates: number;
    numberOfPendingRequests: number;
    displayRequests: boolean;
    displayResponses: boolean;
    displayUpdates: boolean;
}

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps extends LiftedState {}

// Redux dispatch functions we use.
const mapDispatchToProps = {
    dispatchToggleDisplayRequests,
    dispatchToggleDisplayResponses,
    dispatchToggleDisplayUpdates,
    dispatchClearOutput
};

// All props
type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

class ComponentImpl extends React.PureComponent<Props> {
    render() {
        return (
            <Row className="output-controls-bar">
                <Col xs={3}>
                    <SimpleTooltip text="Toggle displaying of requests">
                        {/* Seem to need the extra div to get SimpleTooltip working. */}
                        <div>
                            <PlayPauseCountControl
                                title="Requests:"
                                variant={this.props.numberOfPendingRequests ? "warning" : "outline-secondary"}
                                shouldDisplay={this.props.displayRequests}
                                count={this.props.numberOfPendingRequests}
                                onShouldDisplayChange={this.props.dispatchToggleDisplayRequests}
                            />
                        </div>
                    </SimpleTooltip>
                </Col>
                <Col xs={3}>
                    <SimpleTooltip text="Toggle displaying of responses">
                        {/* Seem to need the extra div to get SimpleTooltip working. */}
                        <div>
                            <PlayPauseCountControl
                                title="Responses:"
                                shouldDisplay={this.props.displayResponses}
                                count={this.props.numberOfResponses}
                                onShouldDisplayChange={this.props.dispatchToggleDisplayResponses}
                            />
                        </div>
                    </SimpleTooltip>
                </Col>
                <Col xs={3}>
                    <SimpleTooltip text="Toggle displaying of updates">
                        {/* Seem to need the extra div to get SimpleTooltip working. */}
                        <div>
                            <PlayPauseCountControl
                                title="Updates:"
                                shouldDisplay={this.props.displayUpdates}
                                count={this.props.numberOfUpdates}
                                onShouldDisplayChange={this.props.dispatchToggleDisplayUpdates}
                            />
                        </div>
                    </SimpleTooltip>
                </Col>
                <Col xs={3}>
                    <SimpleTooltip text="Clear output display">
                        <Button variant="outline-secondary" size="sm" block onClick={this.props.dispatchClearOutput}>
                            <span className="d-xs-none">Clear </span>
                            <span className="fas fa-trash-alt" aria-hidden="true" />
                        </Button>
                    </SimpleTooltip>
                </Col>
            </Row>
        );
    }
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return state.outputContainer;
}

// Generate redux connected component.
export const Component = connect(
    mapStateToProps,
    mapDispatchToProps
)(ComponentImpl);
