'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useWallet } from '../utils/useWallet';
import { STRK_ADDRESS } from '../types';
import { useWalkthrough } from '../utils/WalkthroughContext';
export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    truncatedAddress,
    address,
  } = useWallet();
  const { setStepIndex, stepIndex, setRunTour } = useWalkthrough();

  const handleConnectWallet = async () => {
    if (isConnected) {
      setWalletDropdownOpen(false);
      await disconnect();
    } else {
      await connect(true, [
        {
          tokenAddress: STRK_ADDRESS,
          amount: '100000000000000000000',
          spender:
            '0x07c3667aa4424b48f37c91c390f7c3f5e57d9040c9b888dcfff8a2f4cabd721b',
        },
      ]);
    }
  };

  const navLinks = [
    { href: '/', label: 'Events' },
    { href: '/my-tickets', label: 'My Tickets' },
    { href: '/create-event', label: 'Create Event' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-lg shadow-sm">
      <div className="container mx-auto px-4">
        <div className="navbar py-4">
          {/* Logo */}
          <div className="navbar-start">
            <Link
              href="/"
              className="flex items-center gap-1 text-xl font-bold transition-transform hover:scale-105"
            >
              <span className="text-indigo-600 font-extrabold">Event</span>
              <span className="text-gray-800">Pass</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal gap-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    id={
                      link.href === '/create-event'
                        ? 'create-event-link'
                        : undefined
                    }
                    className="relative px-4 py-2 text-sm font-medium text-gray-700 rounded-full transition-all hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={() => {
                      if (link.href === '/create-event' && stepIndex === 3) {
                        setRunTour(false);
                        setTimeout(() => {
                          setStepIndex(4);
                          localStorage.setItem('pending_walkthrough_step', '4');
                        }, 100);
                      }
                    }}
                  >
                    {link.label}
                    {typeof window !== 'undefined' &&
                      window.location.pathname === link.href && (
                        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-indigo-600 animate-fade-in"></span>
                      )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Wallet Button & Mobile Menu Toggle */}
          <div className="navbar-end flex items-center gap-4">
            <div className="relative">
              <button
                id="connect-wallet-button-header"
                className={`btn btn-sm rounded-full px-5 transition-all ${
                  isConnected
                    ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                } ${isConnecting ? 'opacity-70 cursor-not-allowed' : ''}`}
                onClick={() =>
                  isConnected
                    ? setWalletDropdownOpen(!walletDropdownOpen)
                    : handleConnectWallet()
                }
                disabled={isConnecting}
                aria-label={isConnected ? 'Wallet options' : 'Connect wallet'}
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-xs"></span>
                    Connecting...
                  </span>
                ) : isConnected ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    {truncatedAddress}
                  </span>
                ) : (
                  'Connect Wallet'
                )}
              </button>
              {isConnected && walletDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50 animate-fade-in">
                  <div
                    className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200 hover:cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(address || '');
                    }}
                  >
                    {truncatedAddress}
                  </div>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    onClick={() => {
                      window.open(
                        'https://sepolia-web.argent.xyz/settings',
                        '_blank'
                      );
                    }}
                  >
                    🔧 Manage wallet
                  </button>
                  <div className="px-4 py-2 border-t border-gray-200">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">
                      Recent Transactions
                    </h3>
                    <div
                      className="max-h-40 overflow-y-auto pr-1 hover:cursor-pointer"
                      onClick={() => {
                        window.open(
                          `https://sepolia.voyager.online/contract/${address}#events`,
                          '_blank'
                        );
                      }}
                    >
                      View on Voyager.
                    </div>
                  </div>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    onClick={handleConnectWallet}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
            <div className="lg:hidden">
              <button
                className="btn btn-square btn-ghost"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                <svg
                  className="w-6 h-6 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={
                      mobileMenuOpen
                        ? 'M6 18L18 6M6 6l12 12'
                        : 'M4 6h16M4 12h16M4 18h16'
                    }
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 animate-slide-in">
            <ul className="menu menu-vertical p-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    id={
                      link.href === '/create-event'
                        ? 'create-event-link-mobile'
                        : undefined
                    }
                    className="py-3 text-gray-700 hover:text-indigo-600 font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
