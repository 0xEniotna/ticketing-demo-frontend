'use client';

import { useWallet } from '../utils/useWallet';

interface DisconnectButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function DisconnectButton({
  className = '',
  variant = 'default',
  size = 'md',
  onClick,
}: DisconnectButtonProps) {
  const { disconnect } = useWallet();

  const handleClick = () => {
    disconnect();
    if (onClick) onClick();
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return 'btn-outline btn-error';
      case 'text':
        return 'btn-ghost text-error hover:bg-error hover:bg-opacity-10';
      default:
        return 'btn-error text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'btn-sm';
      case 'lg':
        return 'btn-lg';
      default:
        return '';
    }
  };

  return (
    <button
      className={`btn ${getVariantClasses()} ${getSizeClasses()} ${className}`}
      onClick={handleClick}
    >
      Log out
    </button>
  );
}
