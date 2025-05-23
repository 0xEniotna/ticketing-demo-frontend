'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../utils/useWallet';
import { useContract } from '../contexts/ContractContext';
import { Ticket, TicketCategoryType } from '../contracts/ticketingContract';
import Link from 'next/link';

// Demo event data
const mockEventDetails: Record<
  string,
  {
    name: string;
    date: string;
    venue: string;
    categories: Record<string, string>;
  }
> = {
  '100': {
    name: 'Technosis: Berlin Underground',
    date: 'December 22, 2023',
    venue: 'Tresor Club, Berlin',
    categories: {
      '0': 'Early Bird',
      '1': 'General Entry',
      '2': 'Late',
      '3': 'VIP',
    },
  },
  '101': {
    name: 'Summer Techno Festival 2024',
    date: 'June 15, 2024',
    venue: 'Parc del Fòrum, Barcelona',
    categories: {
      '0': 'Early Bird',
      '1': 'General Entry',
      '2': 'Late',
      '3': 'VIP',
    },
  },
  '102': {
    name: 'Web3 Developer Summit',
    date: 'September 10, 2024',
    venue: 'Crypto Convention Center, Zurich',
    categories: {
      '0': 'Early Bird',
      '1': 'General Entry',
      '2': 'Late',
      '3': 'VIP',
    },
  },
  '103': {
    name: 'Afterlife Ibiza: Tale of Us',
    date: 'July 30, 2024',
    venue: 'Hï Ibiza, Spain',
    categories: {
      '0': 'Early Bird',
      '1': 'General Entry',
      '2': 'Late',
      '3': 'VIP',
    },
  },
  '104': {
    name: 'Digital Art Exhibition',
    date: 'October 5, 2024',
    venue: 'Modern Gallery, New York',
    categories: {
      '0': 'Early Bird',
      '1': 'General Entry',
      '2': 'Late',
      '3': 'VIP',
    },
  },
  '105': {
    name: 'Grand Finals 2024',
    date: 'November 15, 2024',
    venue: 'eSports Arena, Seoul',
    categories: {
      '0': 'Early Bird',
      '1': 'General Entry',
      '2': 'Late',
      '3': 'VIP',
    },
  },
};

// Demo fake tickets
const fakeTickets: Ticket[] = [
  {
    id: BigInt(9876),
    event_id: BigInt(100),
    category_type: TicketCategoryType.VIP,
    owner: '0x0', // Will be replaced with the user's address
    is_used: false,
  },
  {
    id: BigInt(8765),
    event_id: BigInt(101),
    category_type: TicketCategoryType.GeneralEntry,
    owner: '0x0', // Will be replaced with the user's address
    is_used: false,
  },
  {
    id: BigInt(7654),
    event_id: BigInt(102),
    category_type: TicketCategoryType.EarlyBird,
    owner: '0x0',
    is_used: false,
  },
  {
    id: BigInt(6543),
    event_id: BigInt(103),
    category_type: TicketCategoryType.Late,
    owner: '0x0',
    is_used: false,
  },
];

export default function MyTicketsPage() {
  const { account, isConnected, isConnecting, connect, address } = useWallet();
  const { ticketingContract, loading: contractLoading } = useContract();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketIds, setTicketIds] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFakeTickets, setShowFakeTickets] = useState(true); // Control fake tickets display
  const [processingTickets, setProcessingTickets] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    let isMounted = true;

    // Show fake tickets immediately if enabled
    if (showFakeTickets && address) {
      const userFakeTickets = fakeTickets.map((ticket) => ({
        ...ticket,
        owner: address,
      }));
      setTickets(userFakeTickets);
      setIsLoading(false);
    }

    async function loadUserTicketIds() {
      if (!isConnected || !address || !ticketingContract) {
        setTicketIds([]);
        if (!showFakeTickets) setIsLoading(false);
        return;
      }

      // Don't set loading to true here since we already show fake tickets
      setError(null);
      try {
        const ids = await ticketingContract.getUserTickets(address);
        if (isMounted) setTicketIds(ids);
      } catch (err) {
        console.error('Error loading ticket IDs:', err);
        if (isMounted) {
          setError(
            'Failed to load your on-chain tickets. Showing demo tickets only.'
          );
          setTicketIds([]);
        }
      } finally {
        if (isMounted && !showFakeTickets) setIsLoading(false);
      }
    }

    if (!contractLoading) {
      loadUserTicketIds();
    }
    return () => {
      isMounted = false;
    };
  }, [
    isConnected,
    address,
    ticketingContract,
    contractLoading,
    showFakeTickets,
  ]);

  useEffect(() => {
    let isMounted = true;

    // If we already have fake tickets loaded and we're just waiting for real ones,
    // don't show a loading state
    if (tickets.length > 0 && showFakeTickets) {
      setIsLoading(false);
    }

    async function loadTicketDetails() {
      if (ticketIds.length === 0 || !ticketingContract) {
        return; // Skip loading if no real tickets, fake ones are already loaded
      }

      // Don't set global loading, just proceed with fetching real tickets
      try {
        const loadedTickets = [];
        for (const id of ticketIds) {
          try {
            const ticket = await ticketingContract.getTicket(id);
            loadedTickets.push(ticket);
          } catch (ticketError) {
            console.error(`Error loading ticket ${id}:`, ticketError);
          }
        }

        if (isMounted) {
          if (showFakeTickets && address) {
            // Keep fake tickets, add real ones
            const userFakeTickets = fakeTickets.map((ticket) => ({
              ...ticket,
              owner: address,
            }));

            // Filter out any duplicate fake tickets if real ones with same IDs exist
            const fakeTicketIds = userFakeTickets.map((t) => t.id.toString());
            const realTicketIds = loadedTickets.map((t) => t.id.toString());
            const uniqueFakeTickets = userFakeTickets.filter(
              (t) => !realTicketIds.includes(t.id.toString())
            );

            setTickets([...loadedTickets, ...uniqueFakeTickets]);
          } else {
            setTickets(loadedTickets);
          }
        }
      } catch (err) {
        console.error('Error loading ticket details:', err);
        if (isMounted) {
          setError('Failed to load some ticket details from blockchain.');
        }
      }
    }

    loadTicketDetails();
    return () => {
      isMounted = false;
    };
  }, [ticketIds, ticketingContract, address, showFakeTickets]);

  const handleRefresh = async () => {
    if (!isConnected || !address || !ticketingContract) return;
    setIsLoading(true);
    setError(null);
    try {
      const ids = await ticketingContract.getUserTickets(address);
      setTicketIds(ids);

      const loadedTickets = [];
      if (ids.length > 0) {
        for (const id of ids) {
          try {
            const ticket = await ticketingContract.getTicket(id);
            loadedTickets.push(ticket);
          } catch (ticketError) {
            console.error(`Error loading ticket ${id}:`, ticketError);
          }
        }
      }

      if (showFakeTickets) {
        // Always include fake tickets when showFakeTickets is true, regardless of real tickets
        const userFakeTickets = fakeTickets.map((ticket) => ({
          ...ticket,
          owner: address,
        }));
        setTickets([...loadedTickets, ...userFakeTickets]);
      } else {
        // Only show real tickets
        setTickets(loadedTickets);
      }
    } catch (err) {
      console.error('Error refreshing tickets:', err);
      setError('Failed to refresh your tickets. Please try again.');

      // Show fake tickets if there was an error
      if (showFakeTickets && address) {
        const userFakeTickets = fakeTickets.map((ticket) => ({
          ...ticket,
          owner: address,
        }));
        setTickets(userFakeTickets);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTicket = async (ticketId: bigint) => {
    if (!ticketingContract) return;

    // Convert ticketId to string for use as object key
    const ticketIdString = ticketId.toString();

    try {
      // Only set loading state for this specific ticket
      setProcessingTickets((prev) => ({ ...prev, [ticketIdString]: true }));

      // For fake tickets, just update the UI
      if (showFakeTickets && !ticketIds.includes(ticketId)) {
        // Add a slight delay to simulate blockchain transaction
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, is_used: true } : t))
        );
        return;
      }

      // For real tickets
      await ticketingContract.useTicket(ticketId);

      // Update only this ticket's status
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, is_used: true } : t))
      );
    } catch (err) {
      console.error('Error using ticket:', err);
      setError('Failed to use ticket. Please try again.');
    } finally {
      // Clear processing state for this ticket
      setProcessingTickets((prev) => {
        const updated = { ...prev };
        delete updated[ticketIdString];
        return updated;
      });
    }
  };

  const handleListForSale = async (ticketId: bigint, price: bigint) => {
    if (!ticketingContract) return;
    try {
      setIsLoading(true);

      // For fake tickets, just show a message
      if (showFakeTickets && !ticketIds.includes(ticketId)) {
        // Simply show a message without actually executing the transaction
        setTimeout(() => {
          setIsLoading(false);
          alert(
            'This is a demo ticket. In a production environment, this would list your ticket for sale.'
          );
        }, 1000);
        return;
      }

      // For real tickets
      await ticketingContract.listSecondary(ticketId, price);
      const ticketPromises = ticketIds.map((id) =>
        ticketingContract.getTicket(id)
      );
      const loadedTickets = await Promise.all(ticketPromises);
      setTickets(loadedTickets);
    } catch (err) {
      console.error('Error listing ticket for sale:', err);
      setError('Failed to list ticket for sale. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSale = async (ticketId: bigint) => {
    if (!ticketingContract) return;
    try {
      setIsLoading(true);

      // For fake tickets, just show a message
      if (showFakeTickets && !ticketIds.includes(ticketId)) {
        // Simply show a message without actually executing the transaction
        setTimeout(() => {
          setIsLoading(false);
          alert(
            'This is a demo ticket. In a production environment, this would cancel your ticket sale.'
          );
        }, 1000);
        return;
      }

      // For real tickets
      await ticketingContract.cancelSecondary(ticketId);
      const ticketPromises = ticketIds.map((id) =>
        ticketingContract.getTicket(id)
      );
      const loadedTickets = await Promise.all(ticketPromises);
      setTickets(loadedTickets);
    } catch (err) {
      console.error('Error cancelling sale:', err);
      setError('Failed to cancel ticket sale. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFakeTickets = () => {
    setShowFakeTickets(!showFakeTickets);
    if (!showFakeTickets && address) {
      // If enabling fake tickets, show them
      const userFakeTickets = fakeTickets.map((ticket) => ({
        ...ticket,
        owner: address,
      }));
      setTickets(userFakeTickets);
    } else {
      // If disabling fake tickets, show only real ones
      setTickets([]);
      handleRefresh();
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">My Tickets</h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to view your tickets.
          </p>
          <button
            onClick={() => connect()}
            className="btn btn-primary btn-lg rounded-full px-8 transition-transform hover:scale-105"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="container mx-auto max-w-5xl" id="tickets-page">
        <div className="flex justify-between items-center mb-10 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-800">My Tickets</h1>
          <div className="flex gap-4">
            <button
              className="btn btn-ghost btn-sm flex items-center gap-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-all"
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label="Refresh tickets"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <button
              className={`btn btn-sm ${
                showFakeTickets ? 'btn-accent' : 'btn-outline'
              } rounded-full px-4 transition-all`}
              onClick={toggleFakeTickets}
              aria-label="Toggle demo tickets"
            >
              {showFakeTickets ? 'Hide Demo Tickets' : 'Show Demo Tickets'}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-8 shadow-md rounded-lg animate-fade-in">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
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
            <span className="text-white">{error}</span>
          </div>
        )}

        {isLoading || contractLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-gray-200 rounded-xl h-72 w-full"
              ></div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl shadow-lg animate-fade-in">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              No Tickets Found
            </h3>
            <p className="text-gray-600 mb-6">
              You don't have any tickets yet. Explore events to get started!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="btn btn-primary btn-lg rounded-full px-8 transition-transform hover:scale-105"
              >
                Browse Events
              </Link>
              <button
                onClick={toggleFakeTickets}
                className="btn btn-outline btn-lg rounded-full px-8 transition-transform hover:scale-105"
              >
                Show Demo Tickets
              </button>
            </div>
          </div>
        ) : (
          <>
            {showFakeTickets && (
              <div className="mb-6 bg-info/20 text-info p-4 rounded-lg flex items-center gap-3 animate-fade-in">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>Demo Mode:</strong>{' '}
                  {ticketIds.length > 0
                    ? 'Both your real tickets and sample demo tickets are shown.'
                    : 'These are sample tickets for demonstration purposes.'}
                </span>
              </div>
            )}

            {showFakeTickets && ticketIds.length > 0 && (
              <div className="mb-6 bg-warning/20 text-warning p-4 rounded-lg flex items-center gap-3 animate-fade-in">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>
                  <strong>Loading on-chain tickets:</strong> Fetching your real
                  tickets from the blockchain...
                </span>
              </div>
            )}

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              id="tickets-grid"
            >
              {tickets.map((ticket) => {
                const eventId = ticket.event_id.toString();

                // Get the category name from the enum
                let categoryType;
                let categoryTypeNumber: number;

                console.log('ticket.category_type', ticket.category_type);

                if (typeof ticket.category_type === 'number') {
                  // Already a number, use directly
                  categoryType = TicketCategoryType[ticket.category_type];
                  categoryTypeNumber = ticket.category_type;
                } else if (
                  ticket.category_type &&
                  typeof ticket.category_type === 'object' &&
                  'activeVariant' in ticket.category_type
                ) {
                  // Get the variant name (e.g., "EarlyBird")
                  const variantName = (
                    ticket.category_type as any
                  ).activeVariant();
                  categoryType = variantName;

                  // Convert variant name to enum numeric value
                  categoryTypeNumber =
                    TicketCategoryType[
                      variantName as keyof typeof TicketCategoryType
                    ];
                } else if (typeof ticket.category_type === 'string') {
                  // If it's a string (like "EarlyBird")
                  categoryType = ticket.category_type;
                  categoryTypeNumber =
                    TicketCategoryType[
                      ticket.category_type as keyof typeof TicketCategoryType
                    ];
                } else {
                  // Fallback
                  categoryType = 'GeneralEntry';
                  categoryTypeNumber = TicketCategoryType.GeneralEntry;
                }

                // Now use categoryTypeNumber to get the category name from event.categories
                const categoryName =
                  mockEventDetails[eventId]?.categories[
                    categoryTypeNumber.toString()
                  ] ||
                  categoryType?.replace(/([A-Z])/g, ' $1').trim() ||
                  'Regular Ticket';

                // Generate a QR code-like pattern that's unique per ticket
                const ticketIdNum = Number(ticket.id) % 1000;
                const qrPattern = Array.from({ length: 5 }, (_, i) =>
                  Array.from(
                    { length: 5 },
                    (_, j) => (i * j + ticketIdNum) % 3 === 0
                  )
                );

                return (
                  <div
                    key={ticket.id.toString()}
                    className="card bg-white rounded-xl shadow-lg overflow-hidden transform transition-all hover:shadow-xl animate-fade-in-up"
                  >
                    <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 h-32 flex items-center justify-center">
                      {/* QR Code Visualization */}
                      <div className="w-20 h-20 bg-white p-2 rounded-md flex items-center justify-center">
                        <div className="grid grid-cols-5 gap-1 w-full h-full">
                          {qrPattern.map((row, i) =>
                            row.map((cell, j) => (
                              <div
                                key={`${i}-${j}`}
                                className={`w-full h-full ${
                                  cell ? 'bg-black' : 'bg-white'
                                }`}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Perforated Edge Effect */}
                      <div className="absolute bottom-0 left-0 right-0 h-4">
                        <svg width="100%" height="8" className="text-white">
                          <line
                            x1="0"
                            y1="0"
                            x2="100%"
                            y2="0"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray="6 4"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="card-body p-6">
                      <div className="flex justify-between items-start">
                        <h2 className="card-title text-xl font-semibold text-gray-800">
                          {mockEventDetails[eventId]?.name ||
                            `Event #${eventId}`}
                        </h2>
                        <div className="badge badge-primary badge-lg">
                          {categoryName}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-gray-600">
                        <p className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {mockEventDetails[eventId]?.date || 'TBD'}
                        </p>
                        <p className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {mockEventDetails[eventId]?.venue || 'TBD'}
                        </p>
                        <p className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-gray-400"
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
                          <span
                            className={
                              ticket.is_used
                                ? 'text-red-500'
                                : 'text-green-500 font-medium'
                            }
                          >
                            {ticket.is_used ? 'Used' : 'Valid'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Ticket ID: #{ticket.id.toString()}
                        </p>
                      </div>

                      {!ticket.is_used && (
                        <div className="card-actions justify-end mt-6 flex gap-2">
                          <button
                            className="btn btn-primary btn-sm rounded-full px-4 flex items-center gap-2 transition-transform hover:scale-105"
                            onClick={() => handleUseTicket(ticket.id)}
                            disabled={processingTickets[ticket.id.toString()]}
                            aria-label={`Use ticket for ${
                              mockEventDetails[eventId]?.name || 'Event'
                            }`}
                          >
                            {processingTickets[ticket.id.toString()] ? (
                              <>
                                <span className="loading loading-spinner loading-xs"></span>
                                Processing...
                              </>
                            ) : (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Use Now
                              </>
                            )}
                          </button>
                          <button
                            className="btn btn-outline btn-sm rounded-full px-4 flex items-center gap-2 transition-transform hover:scale-105"
                            // onClick={() =>
                            //   handleListForSale(ticket.id, BigInt(20e18))
                            // }

                            disabled
                            aria-label={`Sell ticket for ${
                              mockEventDetails[eventId]?.name || 'Event'
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 1.343-3 3v2m6-5c-1.657 0-3 1.343-3 3v2m6 0h-3m-6 0H6m12 0v-2c0-1.657-1.343-3-3-3m-6 5V9m12 6v2c0 1.657-1.343 3-3 3H9c-1.657 0-3-1.343-3-3v-2"
                              />
                            </svg>
                            List for Sale
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
