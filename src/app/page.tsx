'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { EventCard } from './components/EventCard';
import { mockEvents, featuredMockEvents } from './data/events';
import { useContract } from './contexts/ContractContext';
import { EventInfo } from './contracts/ticketingContract';
import { Event } from './types';
import { useWallet } from './utils/useWallet';
import { useWalkthrough } from './utils/WalkthroughContext';

// Utility to load cached events from localStorage
const loadCachedEvents = (): { events: Event[]; timestamp: number } | null => {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem('cachedEvents');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Validate the cached data (basic check)
      if (
        parsed.events &&
        Array.isArray(parsed.events) &&
        parsed.events.length > 0 &&
        parsed.events[0].id
      ) {
        // Check if cache is fresh (less than 24 hours old)
        const isFresh = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000; // 24 hours
        if (!isFresh) {
          console.log('Cache is older than 24 hours, will refresh');
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing cached events:', e);
    }
  }
  return null;
};

// Utility to save events to localStorage
const saveCachedEvents = (events: Event[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      'cachedEvents',
      JSON.stringify({
        events: events,
        timestamp: Date.now(),
      })
    );
  } catch (e) {
    console.error('Error saving cached events:', e);
  }
};

// Modified to remove redundant name fetching
function mapContractEventToUIEvent(event: EventInfo, id: string): Event {
  let imageNum = (Number(id) % 5) + 1;
  if (isNaN(imageNum) || imageNum < 1 || imageNum > 5) imageNum = 1;

  let eventName = `Event #${id}`;
  if (event.name && event.name !== 'Unnamed Event') {
    eventName = event.name;
  }

  return {
    id: id,
    title: eventName,
    date: new Date(Number(event.start_timestamp) * 1000).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    ),
    location: 'To Be Announced',
    image: `/images/event${imageNum}.png`,
    description: `Join us for an unforgettable experience with ${eventName}!`,
    price: 'Multiple Options',
    categories: ['Live', 'Exclusive'],
    featured: Math.random() > 0.5,
    isBlockchainEvent: true,
  };
}

export default function Home() {
  const cachedData = loadCachedEvents();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [events, setEvents] = useState<Event[]>(cachedData?.events || []);
  const [contractEvents, setContractEvents] = useState<EventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(events.length === 0);
  const [isFetchingInBackground, setIsFetchingInBackground] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(
    cachedData?.timestamp || Date.now()
  );
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { account, requestApprovals } = useWallet();
  const { ticketingContract, loading: contractLoading } = useContract();
  const { setStepIndex, stepIndex, setRunTour, triggerNext } = useWalkthrough();

  const fetchEvents = useCallback(
    async (showLoadingState = false) => {
      if (!ticketingContract) {
        setEvents(mockEvents);
        saveCachedEvents(mockEvents);
        setIsLoading(false);
        return;
      }

      if (showLoadingState) {
        setIsLoading(true);
      } else {
        setIsFetchingInBackground(true);
      }

      setError(null);
      try {
        const fetchedEvents = await ticketingContract.getEvents();
        setContractEvents(fetchedEvents);

        const mappedEvents = fetchedEvents
          .map((event) => mapContractEventToUIEvent(event, event.id.toString()))
          .reverse();
        const combinedEvents = [...mappedEvents, ...mockEvents];

        // Save each event individually to localStorage for quick access
        mappedEvents.forEach((event) => {
          try {
            localStorage.setItem(`event_${event.id}`, JSON.stringify(event));
            // Add a timestamp to track when this data was cached
            localStorage.setItem(
              `event_${event.id}_timestamp`,
              Date.now().toString()
            );
          } catch (e) {
            console.error(`Error saving event ${event.id} to localStorage:`, e);
          }
        });

        // Better detection of changes by comparing event IDs
        const currentEventIds = new Set(events.map((e) => e.id));
        const newEventIds = new Set(combinedEvents.map((e) => e.id));

        // Check if there are new events or if total count has changed
        const hasNewEvents = combinedEvents.some(
          (e) => !currentEventIds.has(e.id)
        );
        const hasRemovedEvents = events.some((e) => !newEventIds.has(e.id));
        const countChanged = currentEventIds.size !== newEventIds.size;

        if (hasNewEvents || hasRemovedEvents || countChanged) {
          console.log('Events have changed, updating state');
          setEvents(combinedEvents);
          setLastUpdated(Date.now());
          saveCachedEvents(combinedEvents);
        } else {
          console.log('No changes in events, keeping current state');
          setLastUpdated(Date.now());
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Showing cached or demo data instead.');
        // Only use mock data if we don't have cached events
        if (events.length === 0) {
          setEvents(mockEvents);
          saveCachedEvents(mockEvents);
        }
      } finally {
        setIsLoading(false);
        setIsFetchingInBackground(false);
      }
    },
    [ticketingContract, events]
  );

  useEffect(() => {
    let isMounted = true;

    if (!contractLoading) {
      // First load: if we have cached events, don't show loading state
      // and only fetch new events if cache is stale
      const cachedData = loadCachedEvents();
      const cacheAge = cachedData
        ? Date.now() - cachedData.timestamp
        : Infinity;
      const shouldRefreshImmediately =
        !cachedData || cacheAge > 24 * 60 * 60 * 1000; // 24 hours

      if (events.length > 0) {
        if (shouldRefreshImmediately) {
          console.log('Cache is stale or missing, refreshing immediately');
          fetchEvents(false); // Fetch in background
        } else {
          console.log(
            'Using cached events, age:',
            Math.round(cacheAge / 3600000),
            'hours'
          );
          // Don't refresh if cache is fresh enough
        }
      } else {
        fetchEvents(true); // Show loading state when no cached data
      }

      // Less frequent background refresh (30 minutes instead of 5)
      const refreshInterval = setInterval(() => {
        if (!isMounted) return;

        // Only refresh if user has been active in the last hour
        const lastUserActivity = localStorage.getItem('lastUserActivity');
        const userWasRecentlyActive =
          lastUserActivity &&
          Date.now() - parseInt(lastUserActivity) < 60 * 60 * 1000;

        if (userWasRecentlyActive) {
          console.log('Performing scheduled refresh');
          fetchEvents(false);
        } else {
          console.log('Skipping scheduled refresh due to user inactivity');
        }
      }, 30 * 60 * 1000); // 30 minutes

      // Track user activity
      const trackActivity = () => {
        localStorage.setItem('lastUserActivity', Date.now().toString());
      };

      window.addEventListener('click', trackActivity);
      window.addEventListener('keypress', trackActivity);
      window.addEventListener('scroll', trackActivity);

      // Set initial activity timestamp
      trackActivity();

      return () => {
        isMounted = false;
        clearInterval(refreshInterval);
        window.removeEventListener('click', trackActivity);
        window.removeEventListener('keypress', trackActivity);
        window.removeEventListener('scroll', trackActivity);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [contractLoading, fetchEvents, events.length]);

  // Debounce the handleRefresh function
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const handleRefresh = debounce(async () => {
    if (!ticketingContract) {
      setEvents(mockEvents);
      saveCachedEvents(mockEvents);
      return;
    }
    await fetchEvents(true); // Show loading state for manual refresh
  }, 500);

  const categories = [...new Set(events.flatMap((event) => event.categories))];
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || event.categories.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const displayFeaturedEvents = featuredMockEvents;

  const handleApprove = async () => {
    if (!account) {
      console.log('No account found');
      return;
    }
    await requestApprovals([
      {
        tokenAddress:
          '0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7',
        amount: '100000000000000000',
        spender: account.address,
      },
    ]);
  };

  // Helper function to format the last updated time
  const formatLastUpdated = () => {
    const now = Date.now();
    const diff = now - lastUpdated;

    if (diff < 60000) {
      // less than 1 minute
      return 'just now';
    } else if (diff < 3600000) {
      // less than 1 hour
      return `${Math.floor(diff / 60000)} minutes ago`;
    } else if (diff < 86400000) {
      // less than 1 day
      return `${Math.floor(diff / 3600000)} hours ago`;
    } else {
      return new Date(lastUpdated).toLocaleString();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 text-white py-20 md:py-32 overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-10 animate-gradient-bg pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
                strokeOpacity="0.15"
              />
            </pattern>
            <pattern
              id="dots"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="10" cy="10" r="1.5" fill="white" fillOpacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-white drop-shadow-lg animate-fade-in bg-gradient-to-r from-blue-300 to-pink-300 bg-clip-text text-transparent">
              Experience the Moment
            </h1>
            <p className="text-lg md:text-2xl mb-10 text-blue-100 font-medium animate-fade-up opacity-90 tracking-wide">
              Secure, modern ticketing for concerts, festivals, and more.
            </p>
            <div className="max-w-md mx-auto flex items-center gap-3 bg-white/10 backdrop-blur-lg p-3 rounded-full shadow-lg border border-blue-400/30 hover:border-blue-400/50 transition-all animate-scale-in hover:shadow-[0_0_15px_rgba(96,165,250,0.5)]">
              <input
                type="text"
                placeholder="Find your next event..."
                className="flex-1 px-5 py-2 bg-transparent text-white placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full transition-all duration-300 placeholder:transition-opacity placeholder:animate-pulse"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search events"
              />
              <button className="btn bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full px-6 py-2 hover:from-blue-600 hover:to-purple-600 hover:shadow-md transition-all duration-300">
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
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* All Events */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Category Filter */}
            <div className="md:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-lg p-6 md:sticky md:top-20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Filter by Category
                  </h3>
                  <button
                    className="md:hidden btn btn-ghost btn-sm text-indigo-600"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                  >
                    {isFilterOpen ? 'Close' : 'Filters'}
                  </button>
                </div>
                <div
                  className={`${isFilterOpen ? 'block' : 'hidden'} md:block`}
                >
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-indigo-50 rounded">
                      <input
                        type="radio"
                        name="category"
                        className="radio radio-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        All Categories
                      </span>
                    </label>
                    {categories.map((category) => (
                      <label
                        key={category}
                        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-indigo-50 rounded"
                      >
                        <input
                          type="radio"
                          name="category"
                          className="radio radio-primary"
                        />
                        <span className="text-sm text-gray-700">
                          {category}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Events Grid */}
            <div className="flex-1" id="events-grid">
              <div className="flex justify-between items-center mb-8 animate-fade-in">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">
                    Upcoming Events
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Last updated: {formatLastUpdated()}{' '}
                    {isFetchingInBackground && (
                      <span className="inline-flex items-center text-blue-600 font-medium">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 text-blue-600 animate-spin mr-1"
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
                        refreshing
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="btn btn-ghost btn-sm flex items-center gap-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-all"
                    onClick={handleRefresh}
                    disabled={isLoading || isFetchingInBackground}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 ${
                        isLoading || isFetchingInBackground
                          ? 'animate-spin'
                          : ''
                      }`}
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
                  <select className="select select-bordered select-sm text-gray-700">
                    <option>Sort by: Date (Newest)</option>
                    <option>Sort by: Date (Oldest)</option>
                    <option>Sort by: Price (Low to High)</option>
                    <option>Sort by: Price (High to Low)</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="alert alert-warning mb-8 shadow-md rounded-lg animate-fade-in">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-yellow-600"
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
                  <span className="text-gray-800">{error}</span>
                </div>
              )}

              {isLoading && events.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse bg-gray-200 rounded-xl h-96 w-full"
                    ></div>
                  ))}
                </div>
              ) : filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="transform transition-all hover:scale-105 hover:shadow-lg animate-fade-in-up"
                      data-event-index={index}
                      data-event-id={event.id}
                    >
                      <EventCard
                        event={event}
                        onGetTickets={() => {
                          if (event.id === '1' && stepIndex === 13) {
                            setRunTour(false);
                            setStepIndex(14);
                          }
                          // Save this event data to localStorage for quick access on the event page
                          localStorage.setItem(
                            `event_${event.id}`,
                            JSON.stringify(event)
                          );
                          // Also save a timestamp to know when this data was cached
                          localStorage.setItem(
                            `event_${event.id}_timestamp`,
                            Date.now().toString()
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 bg-white rounded-xl shadow-md animate-fade-in">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto text-gray-400 mb-4"
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
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    No Events Found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search or check back later.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-50">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-xl shadow-lg animate-fade-in">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              Host Your Next Event
            </h2>
            <p className="text-lg mb-8 text-gray-600">
              Launch and sell tickets with our reliable, modern platform.
            </p>
            <Link
              href="/create-event"
              className="btn btn-primary btn-lg rounded-full px-8 flex items-center gap-2 transition-transform hover:scale-105"
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
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Event
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
