
import type { FC } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Logo: FC<LogoProps> = ({ size = 'medium', className }) => {
  let sizeClass = '';
  switch (size) {
    case 'small':
      sizeClass = 'text-xl';
      break;
    case 'medium':
      sizeClass = 'text-2xl'; // Adjusted to maintain current logo visual size
      break;
    case 'large':
      sizeClass = 'text-4xl';
      break;
    default:
      sizeClass = 'text-2xl'; // Default to current logo visual size
  }

  return (
    <div
      className={cn(
        'font-bold text-gradient-bharatconnect', // Retain existing styles
        sizeClass,
        className
      )}
      style={{ fontFamily: '"Times New Roman", Times, serif' }} // Apply specified font
    >
      BharatConnect
    </div>
  );
};

export default Logo;
