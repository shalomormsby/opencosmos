import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
    transpilePackages: ['@opencosmos/ui'],
};

const withMDX = createMDX({
    // Add markdown plugins here, as desired
});

export default withMDX(nextConfig);
