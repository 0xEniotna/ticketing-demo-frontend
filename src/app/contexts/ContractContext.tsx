'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { TicketingContract } from '../contracts/ticketingContract';
import { useWallet } from '../utils/useWallet';
import { CONTRACT_ADDRESS } from '../utils/argentSdk';

// Define context types
interface ContractContextType {
  ticketingContract: TicketingContract | null;
  loading: boolean;
  error: Error | null;
  address: string | null;
}

// Create context with default values
const ContractContext = createContext<ContractContextType>({
  ticketingContract: null,
  loading: false,
  error: null,
  address: null,
});

// Hook to use the contract context
export const useContract = () => useContext(ContractContext);

interface ContractProviderProps {
  children: ReactNode;
}

export const ContractProvider: React.FC<ContractProviderProps> = ({
  children,
}) => {
  const { account, isConnected, executeTransaction } = useWallet();
  const [ticketingContract, setTicketingContract] =
    useState<TicketingContract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize ticketing contract when account is available
  useEffect(() => {
    const initContract = async () => {
      if (isConnected && account) {
        try {
          setLoading(true);
          setError(null);

          // Initialize the ticketing contract with the current account
          // and pass the executeTransaction function
          const contract = new TicketingContract(
            CONTRACT_ADDRESS,
            account,
            executeTransaction,
            undefined // Use default provider
          );

          setTicketingContract(contract);
        } catch (err) {
          console.error('Failed to initialize contract:', err);
          setError(
            err instanceof Error
              ? err
              : new Error('Unknown error initializing contract')
          );
        } finally {
          setLoading(false);
        }
      } else {
        // Reset contract when disconnected
        setTicketingContract(null);
      }
    };

    initContract();
  }, [account, isConnected, executeTransaction]);

  const value = {
    ticketingContract,
    loading,
    error,
    address: CONTRACT_ADDRESS,
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
};

export default ContractContext;
