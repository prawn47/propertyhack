import React from 'react';

interface ResultCardProps {
  label: string;
  value: string;
  subtitle?: string;
}

const ResultCard: React.FC<ResultCardProps> = ({ label, value, subtitle }) => {
  return (
    <div className="bg-base-200 border border-base-300 rounded-xl p-5">
      <p className="text-sm text-content-secondary mb-1">{label}</p>
      <p className="text-3xl font-bold text-brand-primary leading-tight">{value}</p>
      {subtitle && (
        <p className="text-xs text-content-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
};

export default ResultCard;
