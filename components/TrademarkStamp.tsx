import React from 'react';

interface TrademarkStampProps {
  variant?: 'light' | 'dark';
  className?: string;
}

const TrademarkStamp: React.FC<TrademarkStampProps> = ({ variant = 'light', className = '' }) => {
  return (
    <p
      className={`text-[11px] font-medium tracking-wide select-none text-center ${
        variant === 'dark' ? 'text-slate-300/65' : 'text-slate-400/75'
      } ${className}`}
    >
      ™ Developed by Hamza Raza -AM Opex
    </p>
  );
};

export default TrademarkStamp;
