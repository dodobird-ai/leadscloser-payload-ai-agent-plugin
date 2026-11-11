const { defineConfig } = require("@vue/cli-service");
const webpack = require('webpack');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = defineConfig({
  publicPath: "/chatbot/",
  devServer: {
    port: 1901,
  },

  css: {
    extract: false,

    loaderOptions: {
      scss: {
        // This passes options directly to the Sass implementation
        additionalData: "",
        sassOptions: {
          // Newer versions of sass-loader accept this
          // Note: silenceDeprecations is supported by Dart Sass >=1.58.0
          silenceDeprecations: [
            "import",
            "mixed-decls",
            "color-functions",
            "global-builtin",
          ],
        },
      },
    },
  },

  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
      }),
      new WebpackManifestPlugin({
        fileName: 'assets/manifest.json',
        publicPath: '',
        filter: (file) => file.name.endsWith('.js') || file.name.endsWith('.css'),
      }),
    ],
    module: {
      rules: [
        // other rules...
      ],
    },
  },

  chainWebpack: (config) => {
    config.plugin("eslint").tap(args => { args[0].cacheLocation = require("path").resolve(__dirname, ".cache/eslint"); return args; });
    config.module.rule("js").use("babel-loader").tap(options => ({ ...options, cacheDirectory: require("path").resolve(__dirname, ".cache/babel") }));
    if (process.env.NODE_ENV === "production") {
      config.output.filename("assets/[name].[contenthash:8].js");
      config.output.chunkFilename("assets/[name].[contenthash:8].js");
    }
  },
  productionSourceMap: false,

  transpileDependencies: true,
});
