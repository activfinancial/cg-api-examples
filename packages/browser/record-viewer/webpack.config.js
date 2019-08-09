const TerserPlugin = require("terser-webpack-plugin");

const path = require("path");

const config = {
    entry: "./src/index.ts",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "lib"),
        library: "activ_record_viewer",
        libraryTarget: "umd"
    },
    devtool: "source-map",
    resolve: {
        alias: {
            skatejs: "skatejs/dist/esnext"
        },
        extensions: [".ts", ".js"]
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
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            },
            {
                // Required for url() in index.css.
                test: /\.svg$/,
                use: "url-loader"
            }
        ]
    },
    devServer: {
        // Note webpack-dev-server won't watch non-generated files for changes,
        // so to reload if e.g. the top level html is updated we need this config section.
        // publicPath is required even though it should be implicit from output.path.
        // Also, since switching to yarn workspaces, there are no local node_modules - they are
        // all at the root. So serve the root, too.
        port: 8880,
        contentBase: [__dirname, path.join(__dirname, "../../../node_modules")],
        watchContentBase: true,
        publicPath: "/lib/"
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
