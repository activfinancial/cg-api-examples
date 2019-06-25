/*
 * GetExchangeInfo controls.
 */

import * as React from "react";
import { connect } from "react-redux";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import MakeRequest from "../makeRequest";
import { ConnectionState } from "../../connectionInfo";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { AppState } from "../../state/store";
import { dispatchUpdateMetaData } from "../../state/actions/metaDataActions";

import { Client } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace GetExchangeInfo {
    // State to be lifted up elsewhere (redux in our case).
    export interface LiftedState {
        symbol: string;
    }

    // Own props.
    interface OwnProps {}

    // Redux state we'll see as props.
    interface ReduxStateProps extends LiftedState {
        client: Client | null;
        connectionState: ConnectionState;
    }

    // Redux dispatch functions we use.
    const mapDispatchToProps = {
        dispatchUpdateMetaData
    };

    // All props.
    type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

    class ComponentImpl extends React.PureComponent<Props> {
        render() {
            return (
                <Form onSubmit={this.processSubmit}>
                    {/* Table number. */}
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Form.Label column className={`${labelColumnClass} text-right`}>
                            Symbol or exchange code:
                        </Form.Label>
                        <Col sm={inputColumnWidth}>
                            <Form.Control type="text" size="sm" required value={this.props.symbol} onChange={this.onSymbolChange} />
                        </Col>
                    </Form.Group>

                    <hr />
                    <MakeRequest.Component />
                </Form>
            );
        }

        private readonly onSymbolChange = (e: any /* TODO proper type */) => {
            const symbol = e.target.value;

            this.props.dispatchUpdateMetaData({ symbol });
        };

        private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            MakeRequest.initiate("client.metaData.getExchangeInfo", this.props.symbol, "MetaData.ExchangeInfo", () =>
                this.props.client!.metaData.getExchangeInfo(this.props.symbol)
            );
        };
    }

    function mapStateToProps(state: AppState): ReduxStateProps {
        return {
            client: state.root.client,
            connectionState: state.root.connectionInfo.connectionState,
            symbol: state.metaData.symbol
        };
    }

    // Generate redux connected component.
    export const Component = connect(
        mapStateToProps,
        mapDispatchToProps
    )(ComponentImpl);
} // namespace GetExchangeInfo

export default GetExchangeInfo;
