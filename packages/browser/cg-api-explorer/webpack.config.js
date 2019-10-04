const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");

const config = {
    entry: "./src/index.tsx",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "lib"),
        library: "activ_cg_api_explorer",
        libraryTarget: "umd"
    },
    devtool: "source-map",
    resolve: {
        modules: [path.resolve(__dirname, "style"), "node_modules"],
        extensions: [".ts", ".tsx", ".js", ".jsx"]
    },
    // Bundling the API too, for now.
    //    externals: {
    //        "@activfinancial/cg-api": {
    //            root: "activCgApi",
    //            commonjs: "@activfinancial/cg-api",
    //            commonjs2: "@activfinancial/cg-api",
    //            amd: "@activfinancial/cg-api"
    //        }
    //    },

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
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.scss$/,
                use: ["style-loader", "css-loader", "sass-loader"]
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg|otf)$/,
                use: "file-loader"
            }
        ]
    },
    plugins: [new CopyWebpackPlugin([{ from: "index.html" }])],
    devServer: {
        // Note webpack-dev-server won't watch non-generated files for changes,
        // so to reload if e.g. the top level html is updated we need this config section.
        // cg-api-explorer is self contained, no externals, so no need for root in contentBase
        // like other examples.
        port: 8880,
        host: "0.0.0.0",
        disableHostCheck: true,
        contentBase: __dirname,
        watchContentBase: true
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
