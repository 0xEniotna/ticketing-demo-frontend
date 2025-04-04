'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '../utils/useWallet';
import DisconnectButton from './DisconnectButton';

export default function AccountMenu() {
  const { truncatedAddress, address } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="btn btn-primary text-white flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
        {truncatedAddress}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
              <div className="font-medium">Account</div>
              <div className="text-xs text-gray-500 truncate" title={address}>
                {address}
              </div>
            </div>

            <Link
              href="/my-tickets"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              My Tickets
            </Link>

            <div className="px-4 py-2">
              <DisconnectButton
                variant="text"
                className="w-full text-left justify-start p-0 h-auto min-h-0"
                onClick={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
