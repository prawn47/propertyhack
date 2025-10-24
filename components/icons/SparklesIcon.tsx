
import React from 'react';

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 01-1.414 1.414L12 6.414l-2.293 2.293a1 1 0 01-1.414-1.414L10 5m0 14l2.293-2.293a1 1 0 011.414 1.414L12 17.586l2.293-2.293a1 1 0 011.414 1.414L14 19m-4-5l-2.293-2.293a1 1 0 011.414-1.414L8 13.586l2.293-2.293a1 1 0 011.414 1.414L10 15m10-5l-2.293 2.293a1 1 0 01-1.414-1.414L16 8.414l2.293-2.293a1 1 0 011.414 1.414L18 10z"
    />
  </svg>
);

export default SparklesIcon;
