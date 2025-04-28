import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    turbo: {
      rules: {
        "*.{glsl,vs,fs,vert,frag}": {
          loaders: ["raw-loader"],
          as: "*.js",
        },
      },
    },
  },
};

export default nextConfig;
