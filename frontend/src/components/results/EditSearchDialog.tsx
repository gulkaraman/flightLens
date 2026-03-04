import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { SearchParams } from '../../lib/types';
import { FlightSearchBar } from '../search/FlightSearchBar';

interface EditSearchDialogProps {
  initialParams?: SearchParams;
  onSubmit: (params: SearchParams) => void;
}

export function EditSearchDialog({ initialParams, onSubmit }: EditSearchDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Aramayı Düzenle</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-sm font-semibold text-slate-900">
                Aramayı Düzenle
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Kapat
                </button>
              </Dialog.Close>
            </div>
            <p className="mb-3 text-[11px] text-slate-500">
              Arama parametrelerini güncelleyin; kaydettiğinizde yeni seferler yüklenir.
            </p>
            <div className="max-h-[70vh] overflow-y-auto">
              <FlightSearchBar
                key={initialParams ? JSON.stringify(initialParams) : 'empty'}
                initial={initialParams}
                onSubmit={(params) => {
                  onSubmit(params);
                  setOpen(false);
                }}
              />
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

