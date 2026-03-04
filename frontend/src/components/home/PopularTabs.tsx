import * as Tabs from '@radix-ui/react-tabs';
import { Plane } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatTRY } from '../../lib/format';
import type { PopularTabSection } from '../../data/popular';
import type { FlightSearchPreset } from '../search/FlightSearchBar';
import { routeToPreset } from '../../data/popular';

interface PopularTabsProps {
  title: string;
  sections: PopularTabSection[];
  onPreset: (preset: FlightSearchPreset) => void;
}

export function PopularTabs({ title, sections, onPreset }: PopularTabsProps) {
  const defaultTab = sections[0]?.key ?? '';

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 md:text-base">
          {title}
        </h2>
      </div>
      <Tabs.Root defaultValue={defaultTab} className="w-full">
        <Tabs.List className="mb-3 inline-flex rounded-full bg-slate-100 p-1 text-[11px] text-slate-600">
          {sections.map((section) => (
            <Tabs.Trigger
              key={section.key}
              value={section.key}
              className={cn(
                'rounded-full px-3 py-1 font-medium outline-none data-[state=active]:bg-slate-900 data-[state=active]:text-slate-50'
              )}
            >
              {section.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {sections.map((section) => (
          <Tabs.Content
            key={section.key}
            value={section.key}
            className="mt-2 outline-none data-[state=inactive]:hidden"
          >
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              {section.routes.map((route) => (
                <button
                  key={`${section.key}-${route.from}-${route.to}`}
                  type="button"
                  onClick={() => onPreset(routeToPreset(route))}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-sm transition',
                    'hover:border-emerald-400 hover:bg-emerald-50/60 hover:shadow-md'
                  )}
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
                    <Plane className="h-3 w-3" />
                    <span>Uçak bileti</span>
                  </span>
                  <div className="mt-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {route.from} → {route.to}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-600">
                      {formatTRY(route.price)}’den başlayan fiyatlarla
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  );
}

