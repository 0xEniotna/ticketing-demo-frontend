import { Event } from '../types';

// Import the event image mapping
const eventImageMap = {
  music: '/images/event1.png',
  conference: '/images/event2.png',
  sports: '/images/event4.png',
  arts: '/images/event5.png',
};

// Update your mockEvents array to use consistent images
export const mockEvents: Event[] = [
  {
    id: '100',
    title: 'Technosis: Berlin Underground',
    date: 'December 22, 2023',
    location: 'Tresor Club, Berlin',
    image: eventImageMap.music,
    description: 'Experience the legendary Berlin techno scene with top DJs.',
    price: '$45',
    categories: ['Music', 'Nightlife', 'Techno'],
    featured: true,
    isBlockchainEvent: false,
  },
  {
    id: '101',
    title: 'Summer Techno Festival 2024',
    date: 'June 15, 2024',
    location: 'Parc del Fòrum, Barcelona',
    image: eventImageMap.music,
    description:
      'Three days of non-stop electronic music in the heart of Barcelona.',
    price: '$120 - $250',
    categories: ['Festival', 'Electronic', 'Outdoor'],
    featured: true,
    isBlockchainEvent: false,
  },
  {
    id: '102',
    title: 'Web3 Developer Summit',
    date: 'September 10, 2024',
    location: 'Crypto Convention Center, Zurich',
    image: eventImageMap.conference,
    description:
      'Connect with blockchain innovators and explore the future of Web3.',
    price: '$200',
    categories: ['Conference', 'Technology', 'Blockchain'],
    featured: false,
    isBlockchainEvent: false,
  },
  {
    id: '103',
    title: 'Afterlife Ibiza: Tale of Us',
    date: 'July 30, 2024',
    location: 'Hï Ibiza, Spain',
    image: eventImageMap.music,
    description:
      'The iconic Afterlife experience returns to Ibiza with Tale of Us.',
    price: '€60 - €120',
    categories: ['Music', 'Nightlife', 'Electronic'],
    featured: true,
    isBlockchainEvent: false,
  },
  {
    id: '104',
    title: 'Digital Art Exhibition',
    date: 'October 5, 2024',
    location: 'Modern Gallery, New York',
    image: eventImageMap.arts,
    description:
      'Explore the intersection of art and technology with interactive NFT displays.',
    price: '25 USDC',
    categories: ['Arts', 'NFT', 'Exhibition'],
    featured: false,
    isBlockchainEvent: false,
  },
  {
    id: '105',
    title: 'Grand Finals 2024',
    date: 'November 15, 2024',
    location: 'eSports Arena, Seoul',
    image: eventImageMap.sports,
    description: 'Witness the most anticipated gaming event of the year.',
    price: '$75 - $200',
    categories: ['Sports', 'Gaming', 'Competition'],
    featured: true,
    isBlockchainEvent: false,
  },
];

// Helper function to get random items from an array
function getRandomItems<T>(array: T[], count: number): T[] {
  // Create a copy of the array to avoid modifying the original
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  // Take the first 'count' elements
  return shuffled.slice(0, count);
}

// Get a random subset of events for the featured section
export const featuredMockEvents = getRandomItems(mockEvents, 5);
