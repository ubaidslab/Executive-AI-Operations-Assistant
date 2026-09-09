/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    // This app never uses next/image, so there's no reason for Next's image
    // optimization endpoint to be reachable at all — turning it off removes
    // that surface entirely rather than relying on "we don't happen to use
    // it." Concretely closes the GHSA-2xp9-vwfh-vxw4 AVIF RCE (see README
    // Security notes) for a feature this app doesn't need.
    unoptimized: true,
  },
};

export default nextConfig;
