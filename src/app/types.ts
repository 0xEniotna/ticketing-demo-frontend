export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  description: string;
  price: string;
  categories: string[];
  featured: boolean;
  isBlockchainEvent?: boolean;
}

export const STRK_ADDRESS =
  '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';
