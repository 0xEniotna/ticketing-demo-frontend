import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import Header from './components/Header';
import Footer from './components/Footer';
import ClientOnly from './components/ClientOnly';
import { ContractProvider } from './contexts/ContractContext';
import config from './utils/config';
import WalkthroughManager from './components/WalkthroughManager';
import { WalkthroughProvider } from './utils/WalkthroughContext';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TicketChain - Web3 Event Tickets',
  description:
    'A decentralized ticketing platform built on Starknet with Argent',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className="scroll-smooth">
      <body
        className={`${inter.className} flex flex-col min-h-screen antialiased bg-base-200/30`}
      >
        <ClientOnly>
          <ContractProvider>
            <WalkthroughProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <WalkthroughManager />
            </WalkthroughProvider>
          </ContractProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
