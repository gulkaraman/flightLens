import * as Popover from '@radix-ui/react-popover';
import { Users } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { PassengerCounts } from '../../lib/types';

interface PassengerPickerProps {
  value: PassengerCounts;
  onChange: (value: PassengerCounts) => void;
}

export function PassengerPicker({ value, onChange }: PassengerPickerProps) {
  const total = value.adults + value.children;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        Yolcular
      </span>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 transition hover:border-slate-300'
            )}
          >
            <span>
              {total} yolcu · {value.adults} yetişkin
              {value.children > 0 ? `, ${value.children} çocuk` : ''}
            </span>
            <Users className="h-4 w-4 text-slate-500" />
          </button>
        </Popover.Trigger>
        <Popover.Content
          side="bottom"
          align="start"
          className="z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-lg"
        >
          <div className="space-y-3">
            <Row
              label="Yetişkin"
              description="12+ yaş"
              value={value.adults}
              min={1}
              onChange={(v) => onChange({ ...value, adults: v })}
            />
            <Row
              label="Çocuk"
              description="0-11 yaş"
              value={value.children}
              min={0}
              onChange={(v) => onChange({ ...value, children: v })}
            />
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}

interface RowProps {
  label: string;
  description: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}

function Row({ label, description, value, min, onChange }: RowProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(value + 1);

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-semibold text-slate-900">
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
        >
          +
        </button>
      </div>
    </div>
  );
}

