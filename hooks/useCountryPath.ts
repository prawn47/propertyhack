import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useCountryDetection } from './useCountryDetection';

const FALLBACK_COUNTRY = 'au';

export function useCountryPath(): (path: string) => string {
  const { country } = useCountryDetection();

  return (path: string): string => {
    const prefix = !country || country.toUpperCase() === 'GLOBAL'
      ? FALLBACK_COUNTRY
      : country.toLowerCase();

    const normalised = path.startsWith('/') ? path : `/${path}`;

    return `/${prefix}${normalised}`;
  };
}

interface CountryLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
}

export function CountryLink({ to, ...rest }: CountryLinkProps) {
  const countryPath = useCountryPath();
  return React.createElement(Link, { to: countryPath(to), ...rest });
}
