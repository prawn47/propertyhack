import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useCountry } from '../contexts/CountryContext';

const FALLBACK_COUNTRY = 'au';

export function useCountryPath(): (path: string) => string {
  const { country } = useCountry();

  return (path: string): string => {
    // GLOBAL has no country-specific prefix — fall back to au
    const prefix = !country || country.toUpperCase() === 'GLOBAL'
      ? FALLBACK_COUNTRY
      : country.toLowerCase();

    // Ensure path starts with /
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
