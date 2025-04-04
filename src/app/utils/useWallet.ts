'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SessionAccountInterface,
  deployAndExecuteWithPaymaster,
} from '@argent/invisible-sdk';
import {
  argentWebWallet,
  provider,
  truncateHex,
  paymasterParams,
  CONTRACT_ADDRESS,
} from './argentSdk';

// Type for wallet connection status
export type WalletStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'deploying'
  | 'error';

// Type for approval requests
export type SdkApprovalRequest = {
  tokenAddress: `0x${string}`;
  amount: string;
  spender: `0x${string}`;
};

// Props for useWallet hook
export interface UseWalletProps {
  autoConnect?: boolean;
  onConnected?: (account: SessionAccountInterface) => void;
}

export function useWallet({
  autoConnect = true,
  onConnected,
}: UseWalletProps = {}) {
  const [account, setAccount] = useState<SessionAccountInterface | undefined>();
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);

  // Browser check
  const isBrowser = typeof window !== 'undefined';

  // Check for existing connection
  useEffect(() => {
    if (!isBrowser || !autoConnect || !argentWebWallet || !provider) return;

    let isActive = true;

    const checkConnection = async () => {
      try {
        console.log('Checking for existing wallet connection');
        const res = await argentWebWallet?.connect();
        if (!res || !isActive) return;

        const { account, approvalTransactionHash } = res;

        if (account.getSessionStatus() !== 'VALID') {
          console.log('Session is not valid');
          return;
        }

        if (approvalTransactionHash && provider) {
          console.log('Waiting for approval transaction');
          await provider?.waitForTransaction(approvalTransactionHash);
        }

        if (isActive) {
          setAccount(account);
          setStatus('connected');

          if (onConnected) {
            onConnected(account);
          }
        }
      } catch (err) {
        console.error('Failed to check wallet connection:', err);
        if (isActive) {
          setStatus('error');
          setError(
            err instanceof Error ? err : new Error('Error checking connection')
          );
        }
      }
    };

    checkConnection();

    return () => {
      isActive = false;
    };
  }, [autoConnect, isBrowser, onConnected]);

  // Connect wallet with optional approval requests
  const connect = useCallback(
    async (
      withApproval: boolean = false,
      approvalRequests?: SdkApprovalRequest[]
    ) => {
      if (!isBrowser || !argentWebWallet || !provider) {
        console.error(
          'Cannot connect wallet - browser/wallet/provider not available'
        );
        return;
      }

      try {
        setStatus('connecting');
        setIsConnecting(true);
        setError(null);

        const response = await argentWebWallet?.requestConnection({
          callbackData: 'ticketchain_callback',
          approvalRequests:
            withApproval && approvalRequests ? approvalRequests : undefined,
        });

        if (!response) {
          throw new Error('Connection response is undefined');
        }

        const { account: sessionAccount } = response;
        const isDeployed = await sessionAccount.isDeployed();

        // Handle account deployment if needed
        if (
          response.deploymentPayload &&
          !isDeployed &&
          response.approvalRequestsCalls &&
          paymasterParams
        ) {
          setStatus('deploying');

          const deploymentResponse = await deployAndExecuteWithPaymaster(
            sessionAccount,
            paymasterParams,
            response.deploymentPayload,
            response.approvalRequestsCalls
          );

          if (deploymentResponse) {
            setTxHash(deploymentResponse.transaction_hash);
            await provider?.waitForTransaction(
              deploymentResponse.transaction_hash
            );
            console.log('Account deployed successfully');
          }
        }
        // Handle approval requests
        else if (response.approvalRequestsCalls) {
          const { transaction_hash } = await sessionAccount.execute(
            response.approvalRequestsCalls
          );
          setTxHash(transaction_hash);
          await provider?.waitForTransaction(transaction_hash);
          console.log('Approvals processed successfully');
        }

        // Wait for approval transaction if needed
        if (response.approvalTransactionHash) {
          setTxHash(response.approvalTransactionHash);
          await provider?.waitForTransaction(response.approvalTransactionHash);
          console.log('Approval transaction confirmed');
        }

        setAccount(sessionAccount);
        setStatus('connected');

        if (onConnected) {
          onConnected(sessionAccount);
        }

        return sessionAccount;
      } catch (err) {
        console.error('Error connecting to wallet:', err);
        setStatus('error');
        setError(err instanceof Error ? err : new Error('Unknown error'));
        return undefined;
      } finally {
        setIsConnecting(false);
      }
    },
    [isBrowser, onConnected]
  );

  // Request token approvals
  const requestApprovals = useCallback(
    async (approvalRequests: SdkApprovalRequest[]) => {
      if (!account || !argentWebWallet) {
        throw new Error('Account not connected or wallet not initialized');
      }

      try {
        const approvalTxHash = await argentWebWallet?.requestApprovals(
          approvalRequests
        );
        if (provider) {
          await provider?.waitForTransaction(approvalTxHash);
        }
        return approvalTxHash;
      } catch (error) {
        console.error('Error requesting approvals:', error);
        throw error;
      }
    },
    [account]
  );

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (argentWebWallet) {
      try {
        await argentWebWallet?.clearSession();
      } catch (err) {
        console.error('Error clearing session:', err);
      }
    }

    setAccount(undefined);
    setStatus('disconnected');
    setError(null);
    setTxHash(undefined);
  }, []);

  // Execute a transaction
  const executeTransaction = useCallback(
    async (
      contractAddress: string,
      entrypoint: string,
      calldata: string[] = []
    ) => {
      if (!account) {
        throw new Error('Account not connected');
      }

      try {
        setTxHash(undefined);

        const call = {
          contractAddress,
          entrypoint,
          calldata,
        };

        // Estimate fee with resource bounds
        const { resourceBounds: estimatedResourceBounds } =
          await account.estimateInvokeFee(call, {
            version: '0x3',
          });

        // Execute the transaction
        const { transaction_hash } = await account.execute(call, {
          version: '0x3',
          resourceBounds: estimatedResourceBounds,
          // resourceBounds,
        });

        setTxHash(transaction_hash);

        // Wait for transaction
        await account.waitForTransaction(transaction_hash);

        return transaction_hash;
      } catch (error) {
        console.error('Error executing transaction:', error);
        throw error;
      }
    },
    [account]
  );

  // Call a contract (read-only)
  const callContract = useCallback(
    async <T extends unknown>(
      contractAddress: string,
      entrypoint: string,
      calldata: string[] = []
    ): Promise<T> => {
      if (!provider) {
        throw new Error('Provider not initialized');
      }

      try {
        const result = await provider?.callContract({
          contractAddress,
          entrypoint,
          calldata,
        });

        return result as unknown as T;
      } catch (err) {
        console.error('Error calling contract:', err);
        throw err;
      }
    },
    []
  );

  return {
    account,
    status,
    error,
    txHash,
    connect,
    disconnect,
    executeTransaction,
    requestApprovals,
    callContract,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting' || status === 'deploying',
    address: account?.address,
    truncatedAddress: account ? truncateHex(account.address) : undefined,
  };
}
