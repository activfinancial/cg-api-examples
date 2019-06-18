// get-history example webpack config.
const webpack = require("webpack");
const PermissionsPlugin = require("webpack-permissions-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const path = require("path");

const outputPath = path.resolve(__dirname, "lib");
const outputFile = "get-history.js";

const config = {
    target: "node",
    entry: "./src/index.ts",
    output: {
        filename: outputFile,
        path: outputPath
    },
    devtool: "source-map",
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
    plugins: [
        // Add shebang so the file is runnable without specifying node.
        // "raw" avoids commenting the shebang line itself.
        new webpack.BannerPlugin({
            banner: "#!/usr/bin/env node",
            raw: true
        }),
        // Add make the file executable.
        new PermissionsPlugin({
            buildFiles: [
                {
                    path: path.resolve(__dirname, `${outputPath}/${outputFile}`),
                    fileMode: "755"
                }
            ]
        })
    ],
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
