import Link from 'next/link';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    image: string;
    description: string;
    price: string;
    categories: string[];
    isBlockchainEvent?: boolean;
  };
  compact?: boolean;
}

export function EventCard({ event, compact = false }: EventCardProps) {
  const isBlockchainEvent =
    event.isBlockchainEvent !== undefined
      ? event.isBlockchainEvent
      : !isNaN(Number(event.id)) &&
        !event.id.startsWith('mock') &&
        !event.id.startsWith('featured');

  return (
    <div
      className={`card event-card bg-base-100 shadow-xl ${
        compact ? 'w-72' : 'w-full'
      }`}
    >
      <figure
        className={`relative ${compact ? 'h-40' : 'h-52'} overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
        <img
          src={event.image}
          alt={event.title}
          className="object-cover w-full h-full transition-transform duration-500 hover:scale-110"
        />
        <div className="absolute top-2 right-2 z-20">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              isBlockchainEvent
                ? 'bg-emerald-500/90 text-white'
                : 'bg-purple-500/90 text-white'
            }`}
          >
            {isBlockchainEvent ? 'Onchain' : 'Demo'}
          </span>
        </div>
        <div className="absolute bottom-2 left-3 z-20">
          <span className="text-white text-sm font-medium bg-primary/80 px-3 py-1 rounded-full">
            {event.price}
          </span>
        </div>
      </figure>
      <div className="card-body p-5">
        <div className="flex gap-2 flex-wrap mb-1">
          {event.categories.map((category) => (
            <span key={category} className="badge badge-primary text-xs">
              {category}
            </span>
          ))}
        </div>
        <h2 className="card-title text-xl font-bold">
          {event.title
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')}
        </h2>
        <p className="text-sm text-gray-600 flex items-center gap-1">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {event.date}
        </p>
        <p className="text-sm text-gray-600 flex items-center gap-1">
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {event.location}
        </p>
        {!compact && (
          <p className="text-sm line-clamp-2 mt-2 text-gray-700">
            {event.description}
          </p>
        )}
        <div className="card-actions justify-end mt-3">
          <Link
            href={`/event/${event.id}`}
            className="btn btn-primary btn-sm text-white"
          >
            Get Tickets
          </Link>
        </div>
      </div>
    </div>
  );
}
