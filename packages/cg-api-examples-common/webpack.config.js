const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");

const config = {
    entry: "./src/index.ts",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "lib"),
        library: "activ_cg_api_examples_common",
        libraryTarget: "umd"
    },
    devtool: "source-map",
    resolve: {
        extensions: [".ts", ".js"]
    },
    externals: {
        "@activfinancial/cg-api": {
            root: "activCgApi",
            commonjs: "@activfinancial/cg-api",
            commonjs2: "@activfinancial/cg-api",
            amd: "@activfinancial/cg-api"
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: "source-map-loader",
                enforce: "pre"
            },
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    optimization: {
        // Use terser; default uglify-es is somewhat broken with ES modules.
        minimizer: [
            new TerserPlugin({
                sourceMap: true
            })
        ]
    }
};

module.exports = config;
