import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '../../store/searchContext';
import { getEffectiveScrapeMode, setScrapeMode, type ScrapeMode } from '../../lib/scrapeMode';

export function DemoControls() {
  const { lastSearch } = useSearchStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ScrapeMode>(() => getEffectiveScrapeMode());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setScrapeMode(mode);
  }, [mode]);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCanliDene = () => {
    if (!lastSearch) {
      showMessage('Önce bir arama yapmalısın.');
      return;
    }
    // Live modu seç ve Results sayfasında canlı aramayı tetikle.
    setMode('live');
    setBusy(true);
    navigate('/results', {
      state: {
        fromSearch: true,
        params: lastSearch
      }
    });
    showMessage('Canlı deneme başlatıldı (mode=live).');
    setBusy(false);
  };

  return (
    <div className="relative z-50 flex items-center gap-2 text-[11px] text-slate-600 pointer-events-auto">
      <div className="hidden items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 shadow-sm md:flex">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Scrape</span>
        <select
          className="bg-transparent text-[11px] font-medium text-slate-700 outline-none"
          value={mode}
          onChange={(e) => setMode(e.target.value as ScrapeMode)}
        >
          <option value="auto">Auto (önerilen)</option>
          <option value="live">Live (strict)</option>
          <option value="cache">Cache</option>
          <option value="mock">Mock (demo)</option>
        </select>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={handleCanliDene}
        className="hidden rounded-full border border-emerald-500 bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600 md:inline-flex"
      >
        Canlı dene
      </button>
      {message && (
        <div className="ml-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-medium text-slate-50">
          {message}
        </div>
      )}
    </div>
  );
}

