/**
 * Application configuration
 */

// Default contract addresses if env vars are not set
const DEFAULT_TICKETING_CONTRACT =
  '0x1234567890123456789012345678901234567890123456789012345678901234';

// Environment variables with fallbacks
export const config = {
  // Contract addresses
  contracts: {
    ticketing:
      process.env.NEXT_PUBLIC_TICKETING_CONTRACT_ADDRESS ||
      DEFAULT_TICKETING_CONTRACT,
  },

  // Network settings
  network: {
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID || 'SN_SEPOLIA',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || '',
  },

  // App settings
  app: {
    name: 'EventPass',
    version: '0.1.0',
  },
};

// Helper to check if we're in a development environment
export const isDev = process.env.NODE_ENV === 'development';

// Helper to log config in development mode
if (isDev) {
  console.log('App config:', config);
}

export default config;
