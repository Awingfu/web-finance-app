/** @type {import('next').NextConfig} */
const path = require("path");

module.exports = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH,
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
    quietDeps: true,
  },
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};
