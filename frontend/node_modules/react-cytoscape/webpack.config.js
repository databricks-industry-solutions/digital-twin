var webpack = require('webpack');
var path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

var BUILD_DIR = path.resolve(__dirname, 'sample/public');
var APP_DIR = path.resolve(__dirname, 'sample/app');

var config = {
	entry: APP_DIR + '/index.js',
	output: {
		path: BUILD_DIR,
		filename: 'bundle.js'
	},
	module: {
		loaders: [
			{
				test: /\.js?/,
				include: APP_DIR,
				loader: 'babel-loader'
			}
		],
		rules: [
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			},
			{
				test: /\.(png|svg|jpg|gif)$/,
				use: ['file-loader']
			},
			{
				test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
				loader: 'url-loader',
				options: {
					limit: 10000
				}
			},
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ["es2015", "react"]
					}
				}
			}
		]
	},
	devServer: {
		contentBase: BUILD_DIR,
		port: 9000
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: 'Development',
			inject: true,
			template: './sample/index.html'
		})
	]
};

module.exports = config;