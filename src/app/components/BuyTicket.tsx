'use client';

import { useState } from 'react';
import { useWallet } from '../utils/useWallet';
import { useContract } from '../contexts/ContractContext';
import { TicketCategoryType } from '../contracts/ticketingContract';
import { STRK_ADDRESS } from '../types';

interface BuyTicketProps {
  eventId: bigint;
  onSuccess?: (ticketId: bigint) => void;
}

export default function BuyTicket({ eventId, onSuccess }: BuyTicketProps) {
  const { isConnected, requestApprovals } = useWallet();
  const {
    ticketingContract,
    loading: contractLoading,
    address,
  } = useContract();

  const [selectedCategory, setSelectedCategory] = useState<TicketCategoryType>(
    TicketCategoryType.GeneralEntry
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const categoryOptions = [
    { value: TicketCategoryType.EarlyBird, label: 'Early Bird' },
    { value: TicketCategoryType.GeneralEntry, label: 'General Entry' },
    { value: TicketCategoryType.Late, label: 'Late Entry' },
    { value: TicketCategoryType.VIP, label: 'VIP' },
  ];

  const handlePurchase = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!ticketingContract) {
      setError('Contract is not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const ticketId = await ticketingContract.buyTicket(
        eventId,
        selectedCategory
      );
      setSuccess(`Ticket purchased successfully! Ticket ID: ${ticketId}`);
      if (onSuccess) {
        onSuccess(ticketId);
      }
    } catch (err) {
      console.error('Error purchasing ticket:', err);
      const ticketPrice = await ticketingContract.getTicketPrice(
        eventId,
        selectedCategory
      );
      await requestApprovals([
        {
          tokenAddress: STRK_ADDRESS,
          amount: ticketPrice.toString(),
          spender: address as `0x${string}`,
        },
      ]);
      setError(
        'Failed to purchase ticket. Authorize tokens spending and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title">Buy Tickets</h2>
          <p>Please connect your wallet to purchase tickets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">Buy Tickets</h2>

        {error && (
          <div className="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Select Ticket Category</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(Number(e.target.value) as TicketCategoryType)
            }
            disabled={isLoading || contractLoading}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="card-actions justify-end mt-4">
          <button
            className="btn btn-primary"
            onClick={handlePurchase}
            disabled={isLoading || contractLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Processing...
              </>
            ) : (
              'Buy Ticket'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
