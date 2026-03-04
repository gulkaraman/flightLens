import * as Popover from '@radix-ui/react-popover';
import { CalendarIcon } from 'lucide-react';
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '../../lib/cn';

interface DateButtonProps {
  label: string;
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
}

export function DateButton({ label, value, onChange, placeholder }: DateButtonProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(value ?? new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month)
  });

  const handleSelect = (d: Date) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 transition hover:border-slate-300',
              !value && 'text-slate-400'
            )}
          >
            <span>
              {value
                ? format(value, 'dd MMM yyyy, EEE', {
                    locale: tr
                  })
                : placeholder ?? 'Tarih seç'}
            </span>
            <CalendarIcon className="h-4 w-4 text-slate-500" />
          </button>
        </Popover.Trigger>
        <Popover.Content
          side="bottom"
          align="start"
          className="z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="h-7 w-7 rounded-full text-slate-500 hover:bg-slate-100"
            >
              ‹
            </button>
            <span className="text-xs font-medium text-slate-700">
              {format(month, 'MMMM yyyy', { locale: tr })}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="h-7 w-7 rounded-full text-slate-500 hover:bg-slate-100"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-400">
            {['P', 'P', 'S', 'Ç', 'P', 'C', 'C'].map((d) => (
              <div key={d} className="flex h-6 items-center justify-center">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-[11px]">
            {days.map((day) => (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleSelect(day)}
                className={cn(
                  'flex h-7 items-center justify-center rounded-full border border-transparent text-slate-700 hover:border-emerald-500 hover:bg-emerald-50',
                  value && isSameDay(value, day) && 'border-emerald-500 bg-emerald-500 text-white'
                )}
              >
                {format(day, 'd')}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}

