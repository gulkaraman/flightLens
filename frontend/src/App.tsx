import { Routes, Route } from 'react-router-dom';
import { SearchPage } from './pages/SearchPage';
import { ResultsPage } from './pages/ResultsPage';
import { AppShell } from './components/layout/AppShell';
import { SearchProvider } from './store/searchContext';
import { FilterProvider } from './store/filterContext';

function App() {
  return (
    <SearchProvider>
      <FilterProvider>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<SearchPage />} />
            <Route path="results" element={<ResultsPage />} />
          </Route>
        </Routes>
      </FilterProvider>
    </SearchProvider>
  );
}

export default App;

