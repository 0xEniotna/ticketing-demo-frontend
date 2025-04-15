'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useWallet } from '../utils/useWallet';
import { useContract } from '../contexts/ContractContext';
import { TicketCategoryType } from '../contracts/ticketingContract';
import Link from 'next/link';
import { Call } from 'starknet';
import { useWalkthrough } from '../utils/WalkthroughContext';
import { useRouter } from 'next/navigation';

interface TicketCategoryForm {
  type: TicketCategoryType;
  price: string;
  supply: string;
}

export default function CreateEventPage() {
  const { isConnected, account } = useWallet();
  const { ticketingContract, loading: contractLoading } = useContract();
  const { setStepIndex, stepIndex, setRunTour, triggerNext } = useWalkthrough();
  const router = useRouter();

  // Form state
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [categories, setCategories] = useState<TicketCategoryForm[]>([
    { type: TicketCategoryType.GeneralEntry, price: '1', supply: '100' },
  ]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<bigint | null>(null);

  const [step, setStep] = useState(1);

  useEffect(() => {
    // Check if we have a pending walkthrough step
    const pendingStep = localStorage.getItem('pending_walkthrough_step');
    if (pendingStep === '4') {
      // Clear the flag
      localStorage.removeItem('pending_walkthrough_step');
      // Wait for the component to fully render, then trigger the tour
      setTimeout(() => {
        console.log('Resuming walkthrough on Create Event page');
        setRunTour(true);
      }, 500);
    }
  }, [setRunTour]);

  const handleAddCategory = () => {
    setCategories([
      ...categories,
      { type: TicketCategoryType.GeneralEntry, price: '1', supply: '100' },
    ]);

    // If we're at step 8, directly advance the walkthrough to step 9
    if (stepIndex === 8) {
      console.log('Category added, directly advancing walkthrough to step 9');
      // Short delay to ensure the new category renders before highlighting it
      setTimeout(() => {
        setStepIndex(9);
        setRunTour(true);
      }, 500);
    }
  };

  const handleRemoveCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (
    index: number,
    field: keyof TicketCategoryForm,
    value: string | number
  ) => {
    const updatedCategories = [...categories];
    if (field === 'type') {
      updatedCategories[index].type = value as TicketCategoryType;
    } else {
      updatedCategories[index][field] = value as string;
    }
    setCategories(updatedCategories);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    if (!eventName.trim() || !eventDate.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    if (!ticketingContract) {
      setError('Contract not available. Please try again later.');
      return;
    }
    setIsLoading(true);
    setError(null);

    // Store current stepIndex to avoid stale closures in setTimeout
    const currentStepIndex = stepIndex;

    try {
      const eventTimestamp = Math.floor(new Date(eventDate).getTime() / 1000);
      const newEventId = await ticketingContract.createEvent(
        eventName,
        BigInt(eventTimestamp)
      );
      console.log('newEventId', newEventId);
      setEventId(newEventId);
      setStep(2);
      setStepIndex(6);
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Failed to create event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) {
      setError('Event ID not available');
      return;
    }
    if (!ticketingContract) {
      setError('Contract not available. Please try again later.');
      return;
    }
    if (!account) {
      setError('Account not available. Please try again later.');
      return;
    }
    setIsLoading(true);
    setError(null);

    // Store current stepIndex to avoid stale closures
    const currentStepIndex = stepIndex;

    // Check if we're in the walkthrough and should advance it
    const inWalkthrough =
      localStorage.getItem('walkthrough_submitting_event') === 'true';
    if (inWalkthrough) {
      // Clear the flag
      localStorage.removeItem('walkthrough_submitting_event');
      console.log('Detected event creation as part of walkthrough');
    }

    const calls: Call[] = [];
    try {
      for (const category of categories) {
        const priceInWei = BigInt(parseFloat(category.price) * 1e18);
        const supply = BigInt(parseInt(category.supply));
        calls.push(
          ticketingContract.populateConfigureTicketCategories(
            eventId,
            category.type,
            priceInWei,
            supply
          )
        );
      }
      const tx = await ticketingContract.executeCalls(calls);
      await account.waitForTransaction(tx);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep(3);
      setStepIndex(11);
    } catch (err) {
      console.error('Error adding categories:', err);
      setError('Failed to add ticket categories. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for "Back to Home" click
  const handleBackToHome = () => {
    setRunTour(false);
    setStepIndex(12); // Move WalkthroughManager to step 12
    router.push('/'); // Navigate to homepage
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600">
            Please connect your wallet to create an event.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center animate-fade-in">
          Create a New Event
        </h1>

        {error && (
          <div className="alert alert-error mb-8 shadow-md rounded-lg">
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

        <div
          id="create-event-form"
          className="card bg-white shadow-xl rounded-xl overflow-hidden"
        >
          <div className="card-body p-8">
            {/* Stepper */}
            <ul className="steps steps-horizontal w-full mb-10">
              <li
                className={`step ${
                  step >= 1 ? 'step-primary' : 'step-neutral'
                } font-medium`}
              >
                Event Details
              </li>
              <li
                className={`step ${
                  step >= 2 ? 'step-primary' : 'step-neutral'
                } font-medium`}
              >
                Ticket Categories
              </li>
              <li
                className={`step ${
                  step >= 3 ? 'step-primary' : 'step-neutral'
                } font-medium`}
              >
                Publish
              </li>
            </ul>

            {/* Step 1: Event Details */}
            {step === 1 && (
              <form onSubmit={handleCreateEvent} className="animate-fade-in">
                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text font-semibold text-gray-700">
                      Event Name
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter event name"
                    className="input input-bordered w-full bg-gray-50 focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    required
                    aria-label="Event name"
                  />
                </div>

                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text font-semibold text-gray-700">
                      Event Date
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full bg-gray-50 focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    aria-label="Event date and time"
                  />
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg rounded-full px-8 transition-transform hover:scale-105"
                    disabled={
                      isLoading ||
                      contractLoading ||
                      (stepIndex === 5 && !eventName)
                    }
                    aria-label="Proceed to ticket categories"
                  >
                    {isLoading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Processing...
                      </>
                    ) : (
                      'Next'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Ticket Categories */}
            {step === 2 && (
              <form
                onSubmit={handleAddCategories}
                id="create-category-form"
                className="animate-fade-in"
              >
                <h2
                  id="ticket-categories-heading"
                  className="text-2xl font-semibold text-gray-800 mb-4"
                >
                  Configure Ticket Categories
                </h2>
                <p className="mb-6 text-gray-600">
                  Add ticket categories for your event, each with its own price
                  and supply.
                </p>

                {categories.map((category, index) => (
                  <div
                    key={index}
                    className="card bg-gray-100 mb-4 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    id={
                      index === 0
                        ? 'category-1-form'
                        : index === 1
                        ? 'category-2-form'
                        : undefined
                    }
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-700">
                        Category {index + 1}
                      </h3>
                      {categories.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-red-500 hover:bg-red-100"
                          onClick={() => handleRemoveCategory(index)}
                          aria-label={`Remove category ${index + 1}`}
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
                          aria-label={`Category type for category ${index + 1}`}
                        >
                          <option value={TicketCategoryType.EarlyBird}>
                            Early Bird
                          </option>
                          <option value={TicketCategoryType.GeneralEntry}>
                            General Entry
                          </option>
                          <option value={TicketCategoryType.Late}>
                            Late Entry
                          </option>
                          <option value={TicketCategoryType.VIP}>VIP</option>
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
                            handleCategoryChange(index, 'price', e.target.value)
                          }
                          required
                          aria-label={`Price for category ${index + 1}`}
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
                          aria-label={`Supply for category ${index + 1}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-6 mb-8">
                  <button
                    type="button"
                    className="btn btn-outline btn-block rounded-full transition-transform hover:scale-105"
                    onClick={handleAddCategory}
                    aria-label="Add another ticket category"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Another Category
                  </button>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    className="btn btn-ghost rounded-full px-6"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                    aria-label="Go back to event details"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    id="create-event-submit-button"
                    className="btn btn-primary btn-lg rounded-full px-8 transition-transform hover:scale-105 walkthrough-target"
                    disabled={isLoading || contractLoading}
                    aria-label="Create event"
                    style={{ position: 'relative', zIndex: 50 }}
                  >
                    {isLoading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Processing...
                      </>
                    ) : (
                      'Create Event'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="text-center py-12 animate-fade-in">
                <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Event Created Successfully!
                </h2>
                <p className="mb-8 text-gray-600 max-w-md mx-auto">
                  Your event is now live with all ticket categories configured.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href={`/event/${eventId}`}
                    className="btn btn-primary btn-lg rounded-full px-8 transition-transform hover:scale-105"
                    aria-label="View created event"
                  >
                    View Event
                  </Link>
                  <button
                    onClick={handleBackToHome}
                    className="btn btn-outline btn-lg rounded-full px-8 transition-transform hover:scale-105"
                    aria-label="Return to homepage"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
