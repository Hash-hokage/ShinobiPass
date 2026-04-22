/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // These are known warnings from the wagmi/MetaMask SDK/WalletConnect ecosystem.
    // They are harmless: the modules are only used in React Native, not web.
    // The IgnorePlugin suppresses the build warnings.
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      }),
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^pino-pretty$/,
      })
    );
    return config;
  },
};

module.exports = nextConfig;
