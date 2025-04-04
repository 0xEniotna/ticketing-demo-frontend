'use client';

import { RpcProvider, constants } from 'starknet';
import { ArgentWebWallet } from '@argent/invisible-sdk';

// Environment configuration
export const envName = process.env.NEXT_PUBLIC_ENV_NAME as
  | 'mainnet'
  | 'sepolia';
export const isMainnet = envName === 'mainnet';
export const chainId = isMainnet
  ? constants.StarknetChainId.SN_MAIN
  : constants.StarknetChainId.SN_SEPOLIA;

// Contract configuration
export const CONTRACT_ADDRESS = isMainnet
  ? '0x07c3667aa4424b48f37c91c390f7c3f5e57d9040c9b888dcfff8a2f4cabd721b'
  : '0x07c3667aa4424b48f37c91c390f7c3f5e57d9040c9b888dcfff8a2f4cabd721b';

// Paymaster configuration
export const paymasterParams = !process.env.NEXT_PUBLIC_AVNU_PAYMASTER_API_KEY
  ? undefined
  : {
      apiKey: process.env.NEXT_PUBLIC_AVNU_PAYMASTER_API_KEY,
    };

// Token addresses
export const STRK_TOKEN_ADDRESS =
  '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';

// Create provider instance
export const provider =
  typeof window !== 'undefined'
    ? new RpcProvider({
        chainId: chainId,
        nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
        headers: JSON.parse(process.env.NEXT_PUBLIC_RPC_HEADERS || '{}'),
      })
    : null;

// Initialize Argent Web Wallet directly
export const argentWebWallet =
  typeof window !== 'undefined'
    ? ArgentWebWallet.init({
        appName: 'EventPass',
        environment: envName || 'sepolia',
        sessionParams: {
          allowedMethods: [
            {
              contract: CONTRACT_ADDRESS,
              selector: 'create_event',
            },
            {
              contract: CONTRACT_ADDRESS,
              selector: 'configure_ticket_categories',
            },
            {
              contract: CONTRACT_ADDRESS,
              selector: 'cancel_event',
            },
            {
              contract: CONTRACT_ADDRESS,
              selector: 'buy_ticket',
            },
            {
              contract: CONTRACT_ADDRESS,
              selector: 'use_ticket',
            },
            {
              contract: CONTRACT_ADDRESS,
              selector: 'list_secondary',
            },
            {
              contract: CONTRACT_ADDRESS,
              selector: 'cancel_secondary',
            },
            {
              contract: CONTRACT_ADDRESS,
              selector: 'buy_secondary',
            },
          ],
          validityDays: Number(process.env.NEXT_PUBLIC_VALIDITY_DAYS) || 30,
        },
        paymasterParams,
        provider: new RpcProvider({
          chainId: chainId,
          nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
        }),
      })
    : null;

// Helper function to truncate addresses and transaction hashes
export const truncateHex = (hex: string) =>
  `${hex.slice(0, 6)}...${hex.slice(-4)}`;
