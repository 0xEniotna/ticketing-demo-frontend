import {
  Contract,
  RpcProvider,
  constants,
  uint256,
  cairo,
  CallData,
  shortString,
  byteArray,
  Call,
  CairoCustomEnum,
} from 'starknet';
import ticketingAbi from './ticketing_abi.json';
import { SessionAccountInterface } from '@argent/invisible-sdk';
import { cachedContractCall } from '../utils/contractCache';
import { STRK_ADDRESS } from '../types';

// Enum that mirrors our contract's TicketCategoryType
export enum TicketCategoryType {
  EarlyBird = 0,
  GeneralEntry = 1,
  Late = 2,
  VIP = 3,
}

// Types that mirror our contract's structures
export interface TicketCategory {
  event_id: bigint;
  category_type: TicketCategoryType;
  price: bigint;
  total_supply: bigint;
  remaining: bigint;
}

export interface EventInfo {
  id: bigint;
  creator: string;
  start_timestamp: bigint;
  is_active: boolean;
  // name is not part of the contract's EventInfo struct.
  // It's added separately in the frontend after fetching via getEventName()
  name?: string;
}

export interface Ticket {
  id: bigint;
  event_id: bigint;
  category_type: TicketCategoryType;
  owner: string;
  is_used: boolean;
}

export interface ExecuteTransactionFunction {
  (
    contractAddress: string,
    entrypoint: string,
    calldata: string[]
  ): Promise<string>;
}

export class TicketingContract {
  private contract: Contract;
  private account: SessionAccountInterface;
  private executeTransaction?: ExecuteTransactionFunction;

  constructor(
    contractAddress: string,
    account: SessionAccountInterface,
    executeTransaction?: ExecuteTransactionFunction,
    provider = new RpcProvider({ nodeUrl: constants.NetworkName.SN_SEPOLIA })
  ) {
    if (!contractAddress || contractAddress.trim() === '') {
      throw new Error('Ticketing contract address is required');
    }

    this.account = account;
    this.executeTransaction = executeTransaction;

    // Initialize standard ticketing contract
    this.contract = new Contract(
      ticketingAbi as any,
      contractAddress,
      provider
    );

    this.contract.connect(account);
  }

  // Helper method to execute transactions
  private async execute(
    entrypoint: string,
    calldata: Array<string | object>
  ): Promise<string> {
    if (!this.account || !this.contract) {
      throw new Error('Wallet not connected or contract not available');
    }

    // Use executeTransaction from useWallet if provided
    if (this.executeTransaction) {
      // Convert objects to strings for executeTransaction
      const stringCalldata = calldata.map((item) =>
        typeof item === 'object' ? JSON.stringify(item) : item
      );
      return this.executeTransaction(
        this.contract.address,
        entrypoint,
        stringCalldata as string[]
      );
    }

    // Fallback to direct execution if executeTransaction not provided
    const call = {
      contractAddress: this.contract.address,
      entrypoint,
      calldata, // Starknet.js can handle objects directly in calldata
    };

    const { resourceBounds } = await this.account.estimateInvokeFee(call, {
      version: '0x3',
    });

    const { transaction_hash } = await this.account.execute(call, {
      version: '0x3',
      resourceBounds,
    });

    await this.account.waitForTransaction(transaction_hash);
    return transaction_hash;
  }

  // Helper method to convert JS enum to Cairo enum format
  private toCairoEnum(category_type: TicketCategoryType): object {
    const variantNames = ['EarlyBird', 'GeneralEntry', 'Late', 'VIP'];
    const variantName = variantNames[category_type];

    // Create a proper Cairo enum using CairoCustomEnum
    const cairoEnum = new CairoCustomEnum({ [variantName]: {} });
    if (!cairoEnum) {
      throw new Error(`Invalid category type: ${category_type}`);
    }

    return cairoEnum;
  }

  // Event creator functions
  async createEvent(name: string, start_timestamp: bigint): Promise<bigint> {
    try {
      // Prepare the name as a ByteArray by splitting the string
      const nameAsArray = byteArray.byteArrayFromString(name);

      // Create the calldata with appropriate ByteArray structure
      const calldata = CallData.compile([
        nameAsArray, // ByteArray
        start_timestamp.toString(), // Timestamp
      ]);

      await this.execute('create_event', calldata);

      const eventId = await this.getEventsCount();

      return eventId;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  populateConfigureTicketCategories(
    eventId: bigint,
    category_type: TicketCategoryType,
    price: bigint,
    supply: bigint
  ): Call {
    if (!this.contract.address) {
      throw new Error('Contract address not set');
    }

    // Convert enum to Cairo format
    const cairoEnum = this.toCairoEnum(category_type);

    return this.contract.populate('configure_ticket_categories', [
      eventId.toString(),
      cairoEnum,
      price.toString(),
      supply.toString(),
    ]);
  }

  async executeCalls(calls: Call[]): Promise<string> {
    try {
      const { resourceBounds } = await this.account.estimateInvokeFee(calls, {
        version: '0x3',
      });

      const { transaction_hash } = await this.account.execute(calls, {
        version: '0x3',
        resourceBounds,
      });

      return transaction_hash;
    } catch (error) {
      console.error('Error configuring ticket categories:', error);
      throw error;
    }
  }

  async configureTicketCategories(
    event_id: bigint,
    category_type: TicketCategoryType,
    price: bigint,
    supply: bigint
  ): Promise<void> {
    try {
      // Convert enum to Cairo format
      const cairoEnum = this.toCairoEnum(category_type);

      // Use CallData to properly format the parameters
      const calldata = CallData.compile({
        event_id: event_id.toString(),
        category_type: cairoEnum,
        price: uint256.bnToUint256(price.toString()),
        supply: supply.toString(),
      });

      await this.execute('configure_ticket_categories', calldata);
    } catch (error) {
      console.error('Error configuring ticket categories:', error);
      throw error;
    }
  }

  async cancelEvent(eventId: bigint): Promise<void> {
    try {
      const calldata = [eventId.toString()];
      await this.execute('cancel_event', calldata);
    } catch (error) {
      console.error('Error cancelling event:', error);
      throw error;
    }
  }

  // Ticket buyer functions
  async buyTicket(
    eventId: bigint,
    categoryType: TicketCategoryType
  ): Promise<bigint> {
    try {
      // Convert enum to Cairo format
      const cairoEnum = this.toCairoEnum(categoryType);

      // Use CallData to properly format the parameters
      const calldata = CallData.compile({
        event_id: eventId.toString(),
        category_type: cairoEnum,
      });

      const ticketPrice = await this.getTicketPrice(eventId, categoryType);
      const calls: Call[] = [this.contract.populate('buy_ticket', calldata)];

      await this.executeCalls(calls);

      return BigInt(1);
    } catch (error) {
      console.error('Error buying ticket:', error);
      throw error;
    }
  }

  async useTicket(ticketId: bigint): Promise<boolean> {
    try {
      const calldata = [ticketId.toString()];
      await this.execute('use_ticket', calldata);
      return true;
    } catch (error) {
      console.error('Error using ticket:', error);
      throw error;
    }
  }

  // Secondary market functions
  async listSecondary(ticketId: bigint, price: bigint): Promise<void> {
    try {
      // Convert price to uint256
      const priceUint256 = uint256.bnToUint256(price.toString());

      const calldata = [
        ticketId.toString(),
        priceUint256.low.toString(),
        priceUint256.high.toString(),
      ];

      await this.execute('list_secondary', calldata);
    } catch (error) {
      console.error('Error listing ticket for secondary sale:', error);
      throw error;
    }
  }

  async cancelSecondary(ticketId: bigint): Promise<void> {
    try {
      const calldata = [ticketId.toString()];
      await this.execute('cancel_secondary', calldata);
    } catch (error) {
      console.error('Error cancelling secondary sale:', error);
      throw error;
    }
  }

  async buySecondary(ticketId: bigint): Promise<boolean> {
    try {
      const calldata = [ticketId.toString()];
      await this.execute('buy_secondary', calldata);
      return true;
    } catch (error) {
      console.error('Error buying secondary ticket:', error);
      throw error;
    }
  }

  // View functions - Now with caching to reduce RPC calls
  async getEvent(eventId: bigint): Promise<EventInfo> {
    try {
      // Using cached contract call with 1-minute cache time
      const result = await cachedContractCall<any>(
        this.contract.get_event.bind(this.contract),
        [eventId.toString()],
        'getEvent',
        { cacheTime: 60000 }
      );

      return {
        id: BigInt(result.id),
        creator: result.creator,
        start_timestamp: BigInt(result.start_timestamp),
        is_active: Boolean(result.is_active),
      };
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  // Get event name from the contract
  async getEventName(eventId: bigint): Promise<string> {
    try {
      // Force fresh call without caching to ensure we get the latest data
      const result = await cachedContractCall<any>(
        this.contract.get_event_name.bind(this.contract),
        [eventId.toString()],
        'getEventName',
        { cacheTime: 60000, forceFresh: true }
      );

      // For debugging
      console.log(`Fetched event name for ID ${eventId}:`, result);

      // APPROACH 1: Direct string return (most common case)
      if (typeof result === 'string') {
        return result;
      }

      // APPROACH 2: Object with name property
      if (
        typeof result === 'object' &&
        !Array.isArray(result) &&
        result !== null
      ) {
        if (result.name) {
          return result.name;
        }

        // Try toString() if available
        if (typeof result.toString === 'function') {
          const strResult = result.toString();
          if (strResult && strResult !== '[object Object]') {
            return strResult;
          }
        }
      }

      // APPROACH 3: Array of hex strings that need decoding (ByteArray)
      if (Array.isArray(result) && result.length > 0) {
        // Try to decode each item as a shortString
        const decodedParts = [];
        for (const item of result) {
          if (typeof item === 'string' && item.startsWith('0x')) {
            try {
              const decoded = shortString.decodeShortString(item);
              if (decoded) {
                decodedParts.push(decoded);
              }
            } catch (e) {
              // Ignore decoding errors
            }
          }
        }

        if (decodedParts.length > 0) {
          return decodedParts.join('');
        }
      }

      // Fallback
      return 'Unnamed Event';
    } catch (error) {
      console.error('Error getting event name:', error);
      return 'Unnamed Event';
    }
  }

  async getTicketCategory(
    event_id: bigint,
    category_type: TicketCategoryType
  ): Promise<TicketCategory> {
    // Unique cache key that includes both event ID and category type
    const cacheKey = `getTicketCategory_${event_id}_${category_type}`;

    try {
      // Convert enum to Cairo format using the existing helper method
      const cairoEnum = this.toCairoEnum(category_type);

      // Extended cache time (5 minutes) since categories rarely change
      // Using custom throttling to handle rate limits
      const result = await cachedContractCall<any>(
        this.contract.get_ticket_category.bind(this.contract),
        [event_id.toString(), cairoEnum],
        cacheKey,
        {
          cacheTime: 300000, // 5 minutes cache
          throttleTime: 10000, // 10 seconds between calls
        }
      );

      return {
        event_id: BigInt(result.event_id),
        category_type: result.category_type,
        price: BigInt(result.price),
        total_supply: BigInt(result.total_supply),
        remaining: BigInt(result.remaining),
      };
    } catch (error) {
      console.error(
        `Error getting ticket category for event ${event_id}, category ${category_type}:`,
        error
      );

      // Return stub data with zero values if cache is available
      return {
        event_id: event_id,
        category_type: category_type,
        price: BigInt(0),
        total_supply: BigInt(0),
        remaining: BigInt(0),
      };
    }
  }

  async getTicket(ticketId: bigint): Promise<Ticket> {
    try {
      // Using cached contract call with 1-minute cache time
      const result = await cachedContractCall<any>(
        this.contract.get_ticket.bind(this.contract),
        [ticketId.toString()],
        'getTicket',
        { cacheTime: 60000 }
      );

      const category_type: CairoCustomEnum = result.category_type;
      const activeVariant = category_type.activeVariant();

      let category_type_enum: TicketCategoryType;
      switch (activeVariant) {
        case 'EarlyBird':
          category_type_enum = TicketCategoryType.EarlyBird;
          break;
        case 'GeneralEntry':
          category_type_enum = TicketCategoryType.GeneralEntry;
          break;
        case 'Late':
          category_type_enum = TicketCategoryType.Late;
          break;
        case 'VIP':
          category_type_enum = TicketCategoryType.VIP;
          break;
        default:
          category_type_enum = TicketCategoryType.GeneralEntry;
          break;
      }

      return {
        id: BigInt(result.id),
        event_id: BigInt(result.event_id),
        category_type: category_type_enum,
        owner: result.owner,
        is_used: Boolean(result.is_used),
      };
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  }

  async getUserTickets(userAddress: string): Promise<bigint[]> {
    try {
      // Using cached contract call with 30-second cache time
      // User tickets change more frequently so use shorter cache time
      const result = await cachedContractCall<string[]>(
        this.contract.get_user_tickets.bind(this.contract),
        [userAddress],
        'getUserTickets',
        { cacheTime: 30000 }
      );

      return result.map((id: string) => BigInt(id));
    } catch (error) {
      console.error('Error getting user tickets:', error);
      throw error;
    }
  }

  async isTicketForSale(ticketId: bigint): Promise<boolean> {
    try {
      // Using cached contract call with 30-second cache time
      const result = await cachedContractCall<any>(
        this.contract.is_ticket_for_sale.bind(this.contract),
        [ticketId.toString()],
        'isTicketForSale',
        { cacheTime: 30000 }
      );

      return Boolean(result);
    } catch (error) {
      console.error('Error checking if ticket is for sale:', error);
      throw error;
    }
  }

  async getTicketSalePrice(ticketId: bigint): Promise<bigint> {
    try {
      // Using cached contract call with 30-second cache time
      const result = await cachedContractCall<any>(
        this.contract.get_ticket_sale_price.bind(this.contract),
        [ticketId.toString()],
        'getTicketSalePrice',
        { cacheTime: 30000 }
      );

      const price = uint256.uint256ToBN({
        low: result.low,
        high: result.high,
      });

      return BigInt(price.toString());
    } catch (error) {
      console.error('Error getting ticket sale price:', error);
      throw error;
    }
  }

  // Add a method to get all events with their names
  async getEvents(): Promise<EventInfo[]> {
    try {
      const events: EventInfo[] = [];
      const eventsCount = await this.getEventsCount();

      // Process events in batches to reduce RPC load
      const BATCH_SIZE = 3; // Process 3 events at a time

      for (
        let batchStart = 1;
        batchStart <= Number(eventsCount);
        batchStart += BATCH_SIZE
      ) {
        const batchEnd = Math.min(
          batchStart + BATCH_SIZE - 1,
          Number(eventsCount)
        );
        const batchPromises = [];

        // Create a batch of promises for events in this range
        for (let i = batchStart; i <= batchEnd; i++) {
          batchPromises.push(this.fetchSingleEventWithName(BigInt(i)));
        }

        // Wait for the batch to complete
        const batchResults = await Promise.allSettled(batchPromises);

        // Process results, adding successful fetches to our events array
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            events.push(result.value);
          }
        });

        // Add a short delay between batches to avoid hitting rate limits
        if (batchEnd < Number(eventsCount)) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return events;
    } catch (err) {
      console.error('Error getting events:', err);
      return [];
    }
  }

  // Helper method to fetch a single event with its name
  private async fetchSingleEventWithName(
    eventId: bigint
  ): Promise<EventInfo | null> {
    try {
      // Get basic event info
      const event = await this.getEvent(eventId);

      // Try to fetch the event name
      try {
        const eventName = await this.getEventName(eventId);
        if (eventName && eventName !== 'Unnamed Event') {
          event.name = eventName;
        }
      } catch (nameError) {
        console.error(`Error fetching name for event ${eventId}:`, nameError);
        // Continue even if name fetch fails - we'll use the default name
      }

      return event;
    } catch (err) {
      console.error(`Error getting event ${eventId}:`, err);
      return null;
    }
  }

  // Add the getEventsCount method
  async getEventsCount(): Promise<bigint> {
    try {
      const result = await cachedContractCall<any>(
        this.contract.get_events_count.bind(this.contract),
        [],
        'getEventsCount',
        { cacheTime: 60000 }
      );
      return BigInt(result);
    } catch (error) {
      console.error('Error getting events count:', error);
      return BigInt(0);
    }
  }

  /**
   * Get the price of a ticket for a specific event and category type
   * @param event_id The ID of the event
   * @param category_type The category type (EarlyBird, GeneralEntry, etc.)
   * @returns The price as a bigint, or 0n if the category doesn't exist
   */
  async getTicketPrice(
    event_id: bigint,
    category_type: TicketCategoryType
  ): Promise<bigint> {
    try {
      // We can leverage the existing getTicketCategory method
      const category = await this.getTicketCategory(event_id, category_type);
      return category.price;
    } catch (error) {
      console.error(
        `Error getting ticket price for event ${event_id}, category ${category_type}:`,
        error
      );
      // Return 0 if there's an error
      return BigInt(0);
    }
  }
}
