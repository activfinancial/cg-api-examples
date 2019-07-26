const TerserPlugin = require("terser-webpack-plugin");

const path = require("path");

const config = {
    entry: "./src/index.ts",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "lib"),
        library: "activ_chartiq_adapter",
        libraryTarget: "umd"
    },
    devtool: "source-map",
    resolve: {
        modules: [path.resolve(__dirname, "style"), "node_modules"],
        extensions: [".ts", ".tsx", ".js", ".jsx"]
    },
    externals: {
        "@activfinancial/cg-api": {
            root: "activ",
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
                test: /\.(ts|tsx)$/,
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
