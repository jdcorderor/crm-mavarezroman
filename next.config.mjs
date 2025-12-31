/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.google.com' },
      { protocol: 'https', hostname: 'xhhlwhpqpjpkjvvekqbl.supabase.co' },
      { protocol: 'https', hostname: 'dentallife.com.uy' }
    ],
  },
  webpack: (config) => {
    config.resolve.alias['bufferutil'] = false;
    config.resolve.alias['utf-8-validate'] = false;
    return config;
  },
};

export default nextConfig;