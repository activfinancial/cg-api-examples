/*
 * Collapsible section heading.
 */

import * as React from "react";
import { connect } from "react-redux";
import Collapse from "react-bootstrap/Collapse";
import uuid from "uuid/v4";

import { AppState } from "../../state/store";

// ---------------------------------------------------------------------------------------------------------------------------------

export namespace CollapsibleSection {
    // Own props.
    interface OwnProps {
        /** Title for section. */
        title: string;

        /** Heading element type. "h2" if not provided. */
        as?: string;

        /** Initial collapse state. Default to open if not defined. */
        initialCollapseState?: boolean;
    }

    // Redux state we'll see as props.
    interface ReduxStateProps {
        globalCollapseState: boolean;
    }

    // All props.
    type Props = OwnProps & ReduxStateProps;

    interface State {
        /** Our collapse state; maybe be due to the global state or a click on the header. */
        collapseState: boolean;
    }

    export class ComponentImpl extends React.PureComponent<Props, State> {
        constructor(props: Props) {
            super(props);

            this.state = { collapseState: props.initialCollapseState != null ? props.initialCollapseState : false };
        }

        /** Special handling for collapse state. We only pay attention to the global state when it changes. */
        componentDidUpdate(prevProps: Props) {
            if (
                prevProps.globalCollapseState !== this.props.globalCollapseState &&
                this.props.globalCollapseState !== this.state.collapseState
            ) {
                this.setState({
                    collapseState: this.props.globalCollapseState
                });
            }
        }

        /** Render. */
        render() {
            const isOpen = !this.state.collapseState;
            const Heading = (this.props.as || "h2") as React.ElementType;

            return (
                <>
                    <Heading
                        className="section-heading"
                        aria-controls={this.id}
                        aria-expanded={isOpen}
                        onClick={this.onCollapseSection}
                    >
                        {this.props.title}
                    </Heading>

                    <Collapse in={isOpen}>
                        <div id={this.id}>{this.props.children}</div>
                    </Collapse>
                </>
            );
        }

        private readonly onCollapseSection = () => {
            this.setState((prevState: State) => {
                return {
                    collapseState: !prevState.collapseState
                };
            });
        };

        // Id for tying header to body for collapsing.
        private readonly id = uuid();
    }

    // Generate props from redux state.
    function mapStateToProps(state: AppState): ReduxStateProps {
        return {
            globalCollapseState: state.root.globalCollapseState
        };
    }

    // Generate redux connected component.
    export const Component = connect(mapStateToProps)(ComponentImpl);
} // namespace CollapsibleSection

export default CollapsibleSection;
