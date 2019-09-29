/*
 * Play/pause button with counter.
 */

import * as React from "react";
import { ButtonProps } from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ToggleButton from "react-bootstrap/ToggleButton";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

// ---------------------------------------------------------------------------------------------------------------------------------

interface Props extends Pick<ButtonProps, "variant"> {
    title: string;
    shouldDisplay: boolean;
    count: number;
    onShouldDisplayChange: () => void;
}

class PlayPauseCountControl extends React.PureComponent<Props> {
    private static readonly style: React.CSSProperties = {
        overflow: "auto",
        whiteSpace: "nowrap"
    };

    render() {
        return (
            <ButtonGroup toggle className="btn-block" onChange={this.props.onShouldDisplayChange}>
                <ToggleButton
                    type="checkbox"
                    size="sm"
                    variant={this.props.variant || "outline-secondary"}
                    value={true}
                    checked={this.props.shouldDisplay}
                >
                    <Row>
                        <Col xs={11} style={PlayPauseCountControl.style}>
                            {this.props.title}&nbsp;
                            <span id="responseCountDisplay">{this.props.count}</span>
                        </Col>
                        <Col xs={1}>
                            <span className={`fas ${this.props.shouldDisplay ? "fa-pause" : "fa-play"}`} aria-hidden="true" />
                        </Col>
                    </Row>
                </ToggleButton>
            </ButtonGroup>
        );
    }
}

export default PlayPauseCountControl;
