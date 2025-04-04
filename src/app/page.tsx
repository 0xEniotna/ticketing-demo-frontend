'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EventCard } from './components/EventCard';
import { mockEvents, featuredMockEvents } from './data/events';
import { useContract } from './contexts/ContractContext';
import { EventInfo } from './contracts/ticketingContract';
import { Event } from './types';

// Modified to use async function to fetch event name from the contract
async function mapContractEventToUIEvent(
  event: EventInfo,
  id: string,
  ticketingContract: any
): Promise<Event> {
  let imageNum = (Number(id) % 5) + 1;
  if (isNaN(imageNum) || imageNum < 1 || imageNum > 5) imageNum = 1;

  let eventName = `Event #${id}`;

  if (event.name && event.name !== 'Unnamed Event') {
    eventName = event.name;
  } else {
    // If not, try to fetch it
    try {
      if (ticketingContract) {
        const name = await ticketingContract.getEventName(BigInt(id));

        // If the name is empty or 'Unnamed Event', fall back to the generic name
        if (name && name !== 'Unnamed Event') {
          eventName = name;
        } else {
          console.log(`Using fallback name: Event #${id}`);
        }
      }
    } catch (error) {
      console.error(`Error getting event name for event ${id}:`, error);
    }
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [contractEvents, setContractEvents] = useState<EventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { ticketingContract, loading: contractLoading } = useContract();

  useEffect(() => {
    let isMounted = true;

    async function fetchEvents() {
      if (!ticketingContract) {
        if (isMounted) {
          setEvents(mockEvents);
          setIsLoading(false);
        }
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const fetchedEvents = await ticketingContract.getEvents();
        if (isMounted) {
          setContractEvents(fetchedEvents);

          // Since we now have an async mapping function, we need to use Promise.all
          const mappedEventsPromises = fetchedEvents.map((event) =>
            mapContractEventToUIEvent(
              event,
              event.id.toString(),
              ticketingContract
            )
          );

          const mappedEvents = await Promise.all(mappedEventsPromises);
          setEvents([...mappedEvents, ...mockEvents]);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        if (isMounted) {
          setError('Failed to load events. Showing demo data instead.');
          setEvents(mockEvents);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (!contractLoading) {
      fetchEvents();
      const refreshInterval = setInterval(fetchEvents, 300000);
      return () => {
        isMounted = false;
        clearInterval(refreshInterval);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [ticketingContract, contractLoading]);

  const handleRefresh = async () => {
    if (!ticketingContract) {
      setEvents(mockEvents);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEvents = await ticketingContract.getEvents();
      setContractEvents(fetchedEvents);

      // Since we now have an async mapping function, we need to use Promise.all
      const mappedEventsPromises = fetchedEvents.map((event) =>
        mapContractEventToUIEvent(event, event.id.toString(), ticketingContract)
      );

      const mappedEvents = await Promise.all(mappedEventsPromises);
      setEvents([...mappedEvents, ...mockEvents]);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Showing demo data instead.');
      setEvents(mockEvents);
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Featured Events */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center mb-4 animate-fade-in">
            Spotlight Events
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-lg mx-auto">
            Discover our curated selection of must-see experiences.
          </p>
          {isLoading ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-indigo-100">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-gray-200 rounded-xl h-72 w-80 flex-shrink-0 snap-center"
                >
                  <div className="h-48 bg-gray-300 rounded-t-xl"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayFeaturedEvents.length > 0 ? (
            <div className="relative">
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-indigo-100">
                {displayFeaturedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="w-80 flex-shrink-0 snap-center transform transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <EventCard event={event} compact />
                  </div>
                ))}
              </div>
              <button
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-indigo-500 text-white p-2 rounded-full shadow-md hover:bg-indigo-600 transition-all"
                onClick={() => {
                  const container = document.querySelector('.overflow-x-auto');
                  if (container)
                    container.scrollBy({ left: -300, behavior: 'smooth' });
                }}
                aria-label="Scroll left"
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
              </button>
              <button
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-indigo-500 text-white p-2 rounded-full shadow-md hover:bg-indigo-600 transition-all"
                onClick={() => {
                  const container = document.querySelector('.overflow-x-auto');
                  if (container)
                    container.scrollBy({ left: 300, behavior: 'smooth' });
                }}
                aria-label="Scroll right"
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="text-center p-10 bg-white rounded-xl shadow-md animate-fade-in">
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
                  strokeWidth="2"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-600 mb-2">
                No spotlight events right now.
              </p>
              <p className="text-gray-500 text-sm">
                More exciting events coming soon!
              </p>
            </div>
          )}
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
                        checked={selectedCategory === ''}
                        onChange={() => setSelectedCategory('')}
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
                          checked={selectedCategory === category}
                          onChange={() => setSelectedCategory(category)}
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
            <div className="flex-1">
              <div className="flex justify-between items-center mb-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-800">
                  Upcoming Events
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    className="btn btn-ghost btn-sm flex items-center gap-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-all"
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

              {isLoading ? (
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
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="transform transition-all hover:scale-105 hover:shadow-lg animate-fade-in-up"
                    >
                      <EventCard event={event} />
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
