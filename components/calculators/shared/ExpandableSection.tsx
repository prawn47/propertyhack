import React, { useState, useRef, useEffect } from 'react';

interface ExpandableSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (isOpen) {
      const scrollH = el.scrollHeight;
      setHeight(scrollH);
      const timer = setTimeout(() => setHeight(undefined), 300);
      return () => clearTimeout(timer);
    } else {
      setHeight(el.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
    }
  }, [isOpen]);

  return (
    <div className="border-t border-base-300">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between py-3 text-sm font-medium text-content hover:text-brand-gold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1 rounded"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        ref={contentRef}
        style={{ height: height === undefined ? 'auto' : height }}
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        aria-hidden={!isOpen}
      >
        <div className="pb-4 flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ExpandableSection;
