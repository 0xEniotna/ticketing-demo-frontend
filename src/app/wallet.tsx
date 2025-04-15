'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from './utils/useWallet';
import { SdkApprovalRequest } from './utils/useWallet';
import { CONTRACT_ADDRESS, isMainnet } from './utils/argentSdk';

export default function WalletPage() {
  // Use the enhanced hook instead of manual wallet connection
  const {
    account,
    connect,
    disconnect,
    status,
    isConnected,
    isConnecting,
    txHash,
    requestApprovals,
    executeTransaction,
  } = useWallet();

  const [withApproval, setWithApproval] = useState<boolean>(true);
  const [requestingApprovals, setRequestingApprovals] =
    useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Handle connect button click with option for approvals
  const handleConnect = async () => {
    if (withApproval) {
      const approvalRequests: SdkApprovalRequest[] = [
        {
          tokenAddress:
            '0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7',
          amount: BigInt('100000000000000000').toString(),
          spender: CONTRACT_ADDRESS,
        },
      ];
      await connect(true, approvalRequests);
    } else {
      await connect();
    }
  };

  // Request token approvals
  const handleRequestApprovals = async () => {
    if (!isConnected) return;

    try {
      setRequestingApprovals(true);

      const approvalRequests: SdkApprovalRequest[] = [
        {
          tokenAddress:
            '0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7',
          amount: BigInt('100000000000000000').toString(),
          spender: CONTRACT_ADDRESS,
        },
      ];

      await requestApprovals(approvalRequests);
    } catch (err) {
      console.error(err);
    } finally {
      setRequestingApprovals(false);
    }
  };

  // Execute a transaction
  const handleExecuteTransaction = async () => {
    if (!isConnected) return;

    try {
      setIsExecuting(true);

      await executeTransaction(
        CONTRACT_ADDRESS,
        'buy_ticket',
        ['0x1', '0x0'] // eventId, categoryType
      );
    } catch (err) {
      console.error('Error executing transaction:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8">Wallet Demo</h1>

        {!isConnected ? (
          <>
            <div className="form-control mb-4">
              <label className="label cursor-pointer">
                <span className="label-text">With approval requests</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={withApproval}
                  onChange={(e) => setWithApproval(e.target.checked)}
                />
              </label>
            </div>

            <button
              id="connect-wallet-button"
              className="btn btn-primary w-full"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <span className="loading loading-spinner loading-xs"></span>
                  Connecting...
                </span>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </>
        ) : (
          <>
            <div className="bg-base-200 p-6 rounded-lg mb-6">
              <h2 className="text-xl font-bold mb-4">Connected Account</h2>
              <p className="mb-2">
                <span className="font-semibold">Address:</span>{' '}
                <code className="text-sm break-all">{account?.address}</code>
              </p>
              {txHash && (
                <p className="mb-2">
                  <span className="font-semibold">Transaction:</span>{' '}
                  <a
                    href={`https://${
                      !isMainnet ? 'sepolia.' : ''
                    }starkscan.co/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View on Starkscan
                  </a>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button
                className="btn btn-secondary"
                onClick={handleRequestApprovals}
                disabled={requestingApprovals}
              >
                {requestingApprovals ? (
                  <span className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-xs"></span>
                    Requesting Approvals...
                  </span>
                ) : (
                  'Request Token Approvals'
                )}
              </button>

              <button
                className="btn btn-accent"
                onClick={handleExecuteTransaction}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <span className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-xs"></span>
                    Sending Transaction...
                  </span>
                ) : (
                  'Buy Event Ticket'
                )}
              </button>

              <button className="btn btn-error" onClick={disconnect}>
                Disconnect Wallet
              </button>

              <Link href="/" className="btn btn-outline mt-4">
                Back to Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
