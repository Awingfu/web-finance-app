/** @type {import('next').NextConfig} */
const path = require("path");

module.exports = {
  assetPrefix: "./",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH,
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
  },
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};
