'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useContract } from '../../contexts/ContractContext';
import { useWallet } from '../../utils/useWallet';
import BuyTicket from '../../components/BuyTicket';
import {
  TicketCategoryType,
  EventInfo,
  TicketCategory,
} from '../../contracts/ticketingContract';
import Link from 'next/link';
import { mockEvents } from '../../data/events';
import { ethers } from 'ethers';
import { CairoCustomEnum, Call } from 'starknet';

// Interface for ticket category edit form
interface TicketCategoryForm {
  type: TicketCategoryType;
  price: string;
  supply: string;
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id ? BigInt(params.id as string) : BigInt(0);
  const { ticketingContract, loading: contractLoading } = useContract();
  const { account, isConnected } = useWallet();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketPurchased, setTicketPurchased] = useState(false);

  // New state variables for creator management
  const [isCreator, setIsCreator] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [categoryForms, setCategoryForms] = useState<TicketCategoryForm[]>([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const handleAddCategory = () => {
    setCategoryForms([
      ...categoryForms,
      { type: TicketCategoryType.GeneralEntry, price: '10', supply: '100' },
    ]);
  };

  const handleRemoveCategory = (index: number) => {
    setCategoryForms(categoryForms.filter((_, i) => i !== index));
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchEventData() {
      if (!ticketingContract || eventId === BigInt(0)) return;
      if (!event) setIsLoading(true);
      setError(null);

      try {
        const eventInfo = await ticketingContract.getEvent(eventId);
        const name = await ticketingContract
          .getEventName(eventId)
          .catch((e) => {
            console.error(`Error fetching name for event ${eventId}:`, e);
            return 'Unnamed Event';
          });
        eventInfo.name = name !== 'Unnamed Event' ? name : eventInfo.name;

        if (isMounted) {
          setEvent(eventInfo);

          // Check if current user is the event creator
          if (isConnected && account) {
            // Normalize addresses to remove leading zeros
            // Convert both to BigInt and then back to hex strings to ensure consistent format
            const creatorBigInt = BigInt(eventInfo.creator);
            const userBigInt = BigInt(account.address);

            // Format consistently as hex strings without leading zeros
            const normalizedCreatorAddress = `0x${creatorBigInt.toString(16)}`;
            const normalizedUserAddress = `0x${userBigInt.toString(16)}`;

            // Log for debugging
            console.log(
              'Creator address normalized:',
              normalizedCreatorAddress
            );
            console.log('User address normalized:', normalizedUserAddress);

            // Compare normalized addresses
            setIsCreator(normalizedCreatorAddress === normalizedUserAddress);
          }
        }

        const fetchedCategories = await Promise.all(
          [
            TicketCategoryType.EarlyBird,
            TicketCategoryType.GeneralEntry,
            TicketCategoryType.Late,
            TicketCategoryType.VIP,
          ].map(async (type) => {
            try {
              return await ticketingContract.getTicketCategory(eventId, type);
            } catch (e) {
              console.error(`Error fetching category ${type}:`, e);
              return null;
            }
          })
        );

        const validCategories = fetchedCategories.filter(
          Boolean
        ) as TicketCategory[];
        if (isMounted) {
          setCategories(validCategories);

          // Initialize category forms for editing
          setCategoryForms(
            validCategories.map((cat) => ({
              type: cat.category_type,
              price: ethers.formatEther(cat.price),
              supply: cat.total_supply.toString(),
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        if (isMounted) setError('Failed to load event. Please try again.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (!contractLoading) {
      fetchEventData();
      const refreshInterval = setInterval(fetchEventData, 120000);
      return () => {
        isMounted = false;
        clearInterval(refreshInterval);
      };
    }
  }, [eventId, ticketingContract, contractLoading, account, isConnected]);

  // Handle form field changes
  const handleCategoryChange = (
    index: number,
    field: keyof TicketCategoryForm,
    value: string | number
  ) => {
    const updatedForms = [...categoryForms];
    if (field === 'type') {
      updatedForms[index].type = value as TicketCategoryType;
    } else {
      updatedForms[index][field] = value as string;
    }
    setCategoryForms(updatedForms);
  };

  // Submit category updates
  const handleUpdateCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !isCreator || !ticketingContract || !account) {
      setError('You must be connected as the event creator to update tickets');
      return;
    }

    setUpdateLoading(true);
    setError(null);
    const calls: Call[] = [];

    try {
      for (const category of categoryForms) {
        console.log('category.type', category.type);
        let categoryType: TicketCategoryType;

        // Check if category.type is a complex CairoCustomEnum object
        if (
          category.type &&
          typeof category.type === 'object' &&
          'variant' in category.type
        ) {
          // For CairoCustomEnum, the active variant is the key with a value
          // The other variants will be undefined
          const variantObj = (category.type as any).variant;

          // Find the active variant (the one that's not undefined)
          if ('EarlyBird' in variantObj && variantObj.EarlyBird !== undefined) {
            categoryType = TicketCategoryType.EarlyBird;
          } else if (
            'GeneralEntry' in variantObj &&
            variantObj.GeneralEntry !== undefined
          ) {
            categoryType = TicketCategoryType.GeneralEntry;
          } else if ('Late' in variantObj && variantObj.Late !== undefined) {
            categoryType = TicketCategoryType.Late;
          } else if ('VIP' in variantObj && variantObj.VIP !== undefined) {
            categoryType = TicketCategoryType.VIP;
          } else {
            // Fallback
            categoryType = TicketCategoryType.GeneralEntry;
          }
        } else {
          // If it's already a numeric value, use it directly
          categoryType =
            typeof category.type === 'number'
              ? category.type
              : parseInt(category.type as string);
        }

        // Validate price and supply
        const price = parseFloat(category.price);
        if (isNaN(price) || price < 0) {
          throw new Error(`Invalid price value: ${category.price}`);
        }

        const supply = parseInt(category.supply);
        if (isNaN(supply) || supply < 0) {
          throw new Error(`Invalid supply value: ${category.supply}`);
        }

        const priceInWei = BigInt(price * 1e18);
        const supplyBigInt = BigInt(supply);

        // Use the numeric enum value
        const call = ticketingContract.populateConfigureTicketCategories(
          eventId,
          categoryType,
          priceInWei,
          supplyBigInt
        );

        calls.push(call);
      }

      if (calls.length === 0) {
        throw new Error('No valid categories to update');
      }

      const tx = await ticketingContract.executeCalls(calls);
      await account.waitForTransaction(tx);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      setIsEditMode(false);
    } catch (err) {
      console.error('Error updating categories:', err);
      setError(
        `Failed to update ticket categories: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!ticketingContract || eventId === BigInt(0)) return;
    setIsLoading(true);
    setError(null);

    try {
      const eventInfo = await ticketingContract.getEvent(eventId);
      const name = await ticketingContract.getEventName(eventId).catch((e) => {
        console.error(`Error fetching name for event ${eventId}:`, e);
        return 'Unnamed Event';
      });
      eventInfo.name = name !== 'Unnamed Event' ? name : eventInfo.name;
      setEvent(eventInfo);

      const fetchedCategories = await Promise.all(
        [
          TicketCategoryType.EarlyBird,
          TicketCategoryType.GeneralEntry,
          TicketCategoryType.Late,
          TicketCategoryType.VIP,
        ].map(async (type) => {
          try {
            return await ticketingContract.getTicketCategory(eventId, type);
          } catch (e) {
            console.error(`Error fetching category ${type}:`, e);
            return null;
          }
        })
      );

      const validCategories = fetchedCategories.filter(
        Boolean
      ) as TicketCategory[];
      setCategories(validCategories);

      // Update form data too
      setCategoryForms(
        validCategories.map((cat) => ({
          type: cat.category_type,
          price: ethers.formatEther(cat.price),
          supply: cat.total_supply.toString(),
        }))
      );
    } catch (err) {
      console.error('Error refreshing event:', err);
      setError('Failed to refresh event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketPurchaseSuccess = () => setTicketPurchased(true);

  const mockEvent = mockEvents.find(
    (mockEvt) => String(mockEvt.id) === String(eventId)
  );
  const formattedCreator = event?.creator
    ? `0x${BigInt(event.creator)
        .toString(16)
        .padStart(40, '0')
        .slice(0, 6)}...${BigInt(event.creator).toString(16).slice(-4)}`
    : 'Unknown';

  const eventData = {
    name: event?.name || mockEvent?.title || 'Unknown Event',
    date:
      mockEvent?.date ||
      (event?.start_timestamp
        ? new Date(Number(event.start_timestamp) * 1000).toLocaleString(
            'en-US',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          )
        : 'TBD'),
    venue: mockEvent?.location || 'To Be Announced',
    description: mockEvent?.description || 'No description available.',
    image: mockEvent?.image || '/images/event1.png',
    creator: formattedCreator,
  };

  if (isLoading || contractLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading loading-spinner loading-lg text-teal-500"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card bg-white/90 backdrop-blur-md shadow-lg p-6 rounded-xl max-w-md w-full animate-fade-in">
          <div className="alert alert-error shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-600"
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
            <span>{error || 'Event not found'}</span>
          </div>
          <Link
            href="/"
            className="btn bg-teal-500 text-white mt-4 hover:bg-teal-600 transition-all rounded-full"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Event Details */}
          <div className="lg:w-2/3">
            <div className="flex justify-between items-center mb-6 animate-fade-in">
              <Link
                href="/"
                className="btn btn-ghost text-teal-600 hover:bg-teal-100 rounded-full gap-2 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </Link>
              <div className="flex gap-2">
                {isCreator && event.is_active && (
                  <button
                    className="btn btn-ghost text-indigo-600 hover:bg-indigo-100 rounded-full gap-2 transition-all"
                    onClick={() => setIsEditMode(!isEditMode)}
                    disabled={isLoading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    {isEditMode ? 'Cancel Edit' : 'Edit Tickets'}
                  </button>
                )}
                <button
                  className="btn btn-ghost text-teal-600 hover:bg-teal-100 rounded-full gap-2 transition-all"
                  onClick={handleRefresh}
                  disabled={isLoading}
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
              </div>
            </div>

            <div className="card bg-white/90 backdrop-blur-md shadow-xl rounded-xl overflow-hidden transition-all hover:shadow-2xl animate-fade-in-up">
              <figure className="relative h-72">
                <img
                  src={eventData.image}
                  alt={eventData.name}
                  className="w-full h-full object-cover"
                />
                {!event.is_active && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-6 py-2 rounded-full text-lg font-bold transform rotate-12 shadow-md">
                      Cancelled
                    </span>
                  </div>
                )}
              </figure>
              <div className="card-body p-6">
                <h1 className="card-title text-4xl font-bold text-gray-800 mb-4 capitalize tracking-tight">
                  {eventData.name}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span
                    className={`badge ${
                      event.is_active
                        ? 'bg-teal-500/20 text-teal-700'
                        : 'bg-red-500/20 text-red-700'
                    } border-none font-medium`}
                  >
                    {event.is_active ? 'Active' : 'Cancelled'}
                  </span>
                  {isCreator && (
                    <span className="badge bg-indigo-500/20 text-indigo-700 border-none font-medium">
                      You are the creator
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-teal-500"
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
                    <span className="text-gray-700">{eventData.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-teal-500"
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
                    <span className="text-gray-700">{eventData.venue}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-teal-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="text-gray-700">
                      By {eventData.creator}
                    </span>
                  </div>
                </div>

                <div className="divider my-6"></div>

                <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                  About
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {eventData.description}
                </p>

                {categories.length > 0 && (
                  <>
                    <div className="divider my-6"></div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                      Ticket Options
                    </h2>

                    {isEditMode && isCreator ? (
                      <form
                        onSubmit={handleUpdateCategories}
                        className="space-y-6"
                      >
                        {updateSuccess && (
                          <div className="alert alert-success mb-4 shadow-md">
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>Categories updated successfully!</span>
                          </div>
                        )}

                        {error && (
                          <div className="alert alert-error mb-4 shadow-md">
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

                        {categoryForms.length === 0 ? (
                          <div className="alert alert-warning mb-4 shadow-md">
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
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            <span>No ticket categories found to edit</span>
                          </div>
                        ) : (
                          categoryForms.map((category, index) => (
                            <div
                              key={index}
                              className="card bg-gray-100 mb-4 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-700">
                                  Category {index + 1}
                                </h3>
                                {categories.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm text-red-500 hover:bg-red-100"
                                    aria-label={`Remove category ${index + 1}`}
                                    onClick={() => handleRemoveCategory(index)}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="form-control">
                                  <label className="label">
                                    <span className="label-text text-gray-700">
                                      Category Type
                                    </span>
                                  </label>
                                  <select
                                    className="select select-bordered w-full bg-gray-50 focus:ring-2 focus:ring-indigo-500"
                                    value={category.type}
                                    onChange={(e) =>
                                      handleCategoryChange(
                                        index,
                                        'type',
                                        Number(e.target.value)
                                      )
                                    }
                                    aria-label={`Category type for category ${
                                      index + 1
                                    }`}
                                  >
                                    <option
                                      value={TicketCategoryType.EarlyBird}
                                    >
                                      Early Bird
                                    </option>
                                    <option
                                      value={TicketCategoryType.GeneralEntry}
                                    >
                                      General Entry
                                    </option>
                                    <option value={TicketCategoryType.Late}>
                                      Late Entry
                                    </option>
                                    <option value={TicketCategoryType.VIP}>
                                      VIP
                                    </option>
                                  </select>
                                </div>

                                <div className="form-control">
                                  <label className="label">
                                    <span className="label-text text-gray-700">
                                      Price (USD)
                                    </span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="input input-bordered w-full bg-gray-50 focus:ring-2 focus:ring-indigo-500"
                                    value={category.price}
                                    onChange={(e) =>
                                      handleCategoryChange(
                                        index,
                                        'price',
                                        e.target.value
                                      )
                                    }
                                    required
                                    aria-label={`Price for category ${
                                      index + 1
                                    }`}
                                  />
                                </div>

                                <div className="form-control">
                                  <label className="label">
                                    <span className="label-text text-gray-700">
                                      Supply
                                    </span>
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    className="input input-bordered w-full bg-gray-50 focus:ring-2 focus:ring-indigo-500"
                                    value={category.supply}
                                    onChange={(e) =>
                                      handleCategoryChange(
                                        index,
                                        'supply',
                                        e.target.value
                                      )
                                    }
                                    required
                                    aria-label={`Supply for category ${
                                      index + 1
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}

                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="btn btn-ghost mr-2"
                            onClick={() => setIsEditMode(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn bg-teal-600 text-white hover:bg-teal-700"
                            disabled={
                              updateLoading || categoryForms.length === 0
                            }
                          >
                            {updateLoading ? (
                              <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Updating...
                              </>
                            ) : (
                              'Update Tickets'
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        {categories
                          .filter(
                            (category) => category.total_supply > BigInt(0)
                          )
                          .map((category) => {
                            const categoryType = (
                              category.category_type as unknown as CairoCustomEnum
                            ).activeVariant();

                            const categoryName = categoryType;
                            return (
                              <div
                                key={`${eventId.toString()}-${
                                  category.category_type
                                }`}
                                className="flex justify-between items-center p-4 bg-teal-50/50 rounded-lg hover:bg-teal-100 transition-all"
                              >
                                <div>
                                  <h3 className="font-medium text-gray-800">
                                    {categoryName}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {category.remaining.toString()} of{' '}
                                    {category.total_supply.toString()} left
                                  </p>
                                </div>
                                <span className="text-teal-600 font-semibold">
                                  {Number(
                                    ethers.formatEther(category.price)
                                  ).toFixed(2)}{' '}
                                  USD
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Buy Ticket Section */}
          <div className="lg:w-1/3">
            <div className="sticky top-20">
              {ticketPurchased ? (
                <div className="card bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-6 animate-fade-in-up">
                  <h2 className="text-2xl font-bold text-teal-600 mb-3">
                    Success!
                  </h2>
                  <p className="text-gray-600 mb-4">Your ticket is ready.</p>
                  <Link
                    href="/my-tickets"
                    className="btn bg-gradient-to-r from-indigo-500 to-teal-500 text-white rounded-full w-full hover:from-indigo-600 hover:to-teal-600 transition-all"
                  >
                    View My Tickets
                  </Link>
                </div>
              ) : event.is_active ? (
                <div className="card bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-6 transition-all hover:shadow-2xl animate-fade-in-up">
                  <BuyTicket
                    eventId={eventId}
                    onSuccess={handleTicketPurchaseSuccess}
                  />
                </div>
              ) : (
                <div className="card bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-6 animate-fade-in-up">
                  <h2 className="text-2xl font-bold text-red-600 mb-3">
                    Cancelled
                  </h2>
                  <p className="text-gray-600">
                    Tickets are no longer available.
                  </p>
                </div>
              )}

              {isCreator && event.is_active && !isEditMode && (
                <div className="mt-4 card bg-white/90 backdrop-blur-md shadow-xl rounded-xl p-6 animate-fade-in-up">
                  <h3 className="text-xl font-bold text-indigo-600 mb-2">
                    Creator Actions
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="btn btn-block bg-indigo-500 text-white hover:bg-indigo-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Ticket Categories
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
