const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");

const path = require("path");
const fs = require("fs");

// ---------------------------------------------------------------------------------------------------------------------------------

const config = {
    entry: {
        main: "./src/index.tsx"
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "lib"),
        library: "activ_workstation",
        libraryTarget: "umd"
    },
    devtool: "source-map",
    resolve: {
        modules: [path.resolve(__dirname, "style"), "node_modules"],
        extensions: [".ts", ".tsx", ".js", ".jsx"]
    },
    externals: {
        // Openfin is provided by the openfin runtime.
        openfin: ""
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
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            hmr: process.env.NODE_ENV === "development"
                        }
                    },
                    "css-loader",
                    "sass-loader"
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg|otf)$/,
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            outputPath: "assets"
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "src/index.html",
            // HtmlWebpackPlugin v4 will also include shared chunks we need, not just the specified one.
            chunks: ["main"]
        }),
        // TODO ideally only one css for the main page, and one for the app pages.
        // Currently getting one for each so there's probably not much point bothering with this plugin at all...
        // Just use style-loader for scss.
        new MiniCssExtractPlugin({
            filename: "[name].css",
            chunkFilename: "[id].css",
            ignoreOrder: false // Enable to remove warnings about conflicting order
        }),
        new FaviconsWebpackPlugin("./favicon.png")
    ],
    devServer: {
        // Note webpack-dev-server won't watch non-generated files for changes,
        // so to reload if e.g. the top level html is updated we need this config section.
        port: 8881,
        // HACK something broke recently. Seems to think there's always a change to rebuild, so
        // the app keep reloading in a loop. So disabled for now.
        inline: false
    },
    optimization: {
        // Use terser; default uglify-es is somewhat broken with ES modules.
        minimizer: [
            new TerserPlugin({
                sourceMap: true
            })
        ],
        splitChunks: {
            // Need HtmlWebpackPlugin v4 to work nicely with this.
            chunks: "all"
        }
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------

// Get list of windows.
const windowTypesDir = "src/windowTypes";

for (const htmlFile of fs.readdirSync(windowTypesDir)) {
    const windowType = htmlFile.replace(/\.html$/, "");
    if (windowType === htmlFile) {
        continue;
    }

    // HtmlWebpackPlugin for each window type.
    const plugin = new HtmlWebpackPlugin({
        filename: htmlFile,
        template: path.join(windowTypesDir, htmlFile),
        // Only include the page's own chunk.
        // HtmlWebpackPlugin v4 will also include shared chunks we need, not just the specified one.
        chunks: [windowType]
    });

    config.plugins.push(plugin);

    // Entry point for each page.
    // NB won't work without "./" prefix, but path.join won't add one.
    config.entry[windowType] = `./${path.join("./", windowTypesDir, `${windowType}.ts`)}`;
}

module.exports = config;
