'use client';

import Link from 'next/link';

export default function Sidebar() {
  return (
    <div className="drawer-side">
      <label htmlFor="main-drawer" className="drawer-overlay"></label>
      <ul className="menu w-full p-4 w-80 min-h-full bg-base-100">
        <li className="mb-2 font-semibold text-lg">TicketChain</li>
        <li>
          <Link href="/">Events</Link>
        </li>
        <li>
          <Link href="/my-tickets">My Tickets</Link>
        </li>
        <li>
          <Link href="/create-event">Create Event</Link>
        </li>
      </ul>
    </div>
  );
}
