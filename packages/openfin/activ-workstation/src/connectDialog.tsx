/*
 * Connect dialog.
 */

import * as React from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";

import CgState from "./cgState";

// ---------------------------------------------------------------------------------------------------------------------------------

interface Props {
    show: boolean;
    cgState: CgState;

    url: string;
    userId: string;
    password: string;

    onHide: () => void;
    onConnect: () => void;
    onDisconnect: () => void;

    onUrlChange: (url: string) => void;
    onUserIdChange: (userId: string) => void;
    onPasswordChange: (password: string) => void;
}

function ConnectDialog(props: Props) {
    return (
        <Modal id="connectionFormModal" show={props.show} onHide={props.onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Connection settings</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form
                    onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        props.onConnect();
                    }}
                >
                    <Row>
                        <Col xs={2}>
                            <span>Url:</span>
                        </Col>

                        <Col xs={10}>
                            <Form.Group>
                                <Form.Label className="sr-only">Address</Form.Label>

                                <Form.Control
                                    type="text"
                                    value={props.url}
                                    placeholder="Address"
                                    required
                                    disabled={props.cgState !== CgState.disconnected}
                                    onChange={(e: any) => props.onUrlChange(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col xs={2}></Col>

                        <Col xs={3}>
                            <Form.Group>
                                <Form.Label className="sr-only">User id</Form.Label>

                                <Form.Control
                                    type="text"
                                    value={props.userId}
                                    placeholder="User id"
                                    required
                                    disabled={props.cgState !== CgState.disconnected}
                                    onChange={(e: any) => props.onUserIdChange(e.target.value)}
                                />
                            </Form.Group>
                        </Col>

                        <Col xs={3}>
                            <Form.Group>
                                <Form.Label className="sr-only">Password</Form.Label>

                                <Form.Control
                                    type="password"
                                    value={props.password}
                                    placeholder="Password"
                                    required
                                    disabled={props.cgState !== CgState.disconnected}
                                    onChange={(e: any) => props.onPasswordChange(e.target.value)}
                                />
                            </Form.Group>
                        </Col>

                        <Col xs={2}>
                            <Button variant="light" disabled={props.cgState === CgState.disconnected} onClick={props.onDisconnect}>
                                Disconnect
                            </Button>
                        </Col>

                        <Col xs={2}>
                            <Button type="submit" disabled={props.cgState !== CgState.disconnected}>
                                Connect
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Modal.Body>
        </Modal>
    );
}

export default ConnectDialog;
