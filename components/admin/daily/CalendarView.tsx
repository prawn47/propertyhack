import React from 'react';

interface CalendarViewProps {
  completedDates: string[];
  month: number;
  year: number;
  size?: 'sm' | 'md';
}

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

const CalendarView: React.FC<CalendarViewProps> = ({ completedDates, month, year, size = 'md' }) => {
  const completedSet = new Set(completedDates);
  const today = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monday=0, Sunday=6 (convert from JS where Sunday=0)
  const jsDay = firstDay.getDay();
  const startOffset = jsDay === 0 ? 6 : jsDay - 1;

  const cells: React.ReactNode[] = [];

  // Empty cells for offset
  for (let i = 0; i < startOffset; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(year, month, day);
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const weekend = isWeekend(dayOfWeek);
    const isToday = dateKey === todayKey;
    const isFuture = date > today;
    const isCompleted = completedSet.has(dateKey);
    const isMissedWeekday = !weekend && !isFuture && !isCompleted && !isToday;

    const cellSize = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs';

    let dotClass = '';
    if (isCompleted) {
      dotClass = 'bg-brand-gold text-white';
    } else if (isMissedWeekday) {
      dotClass = 'bg-gray-200 text-gray-400';
    } else if (weekend || isFuture) {
      dotClass = 'text-gray-300';
    }

    const ringClass = isToday ? 'ring-2 ring-brand-gold ring-offset-1' : '';

    cells.push(
      <div
        key={day}
        className={`${cellSize} rounded-full flex items-center justify-center font-medium ${dotClass} ${ringClass}`}
      >
        {day}
      </div>
    );
  }

  const headerSize = size === 'sm' ? 'text-[10px] w-5' : 'text-xs w-7';
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';

  return (
    <div className="inline-block">
      <div className={`grid grid-cols-7 ${gap} mb-1`}>
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className={`${headerSize} text-center text-content-secondary font-medium`}>
            {d}
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${gap}`}>
        {cells}
      </div>
    </div>
  );
};

export default CalendarView;
