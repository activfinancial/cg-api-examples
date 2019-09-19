/*
 * ContentGateway list.
 */

interface ContentGateways {
    [key: string]: string;
}

const contentGateways: ContentGateways = {
    ny4: "ams://cg-ny4-web.activfinancial.com/ContentGateway:Service",
    replay: "ams://cg-ny4-replay.activfinancial.com/ContentGateway:Service"
};

export default contentGateways;
