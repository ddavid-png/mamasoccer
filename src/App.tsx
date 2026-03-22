import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RegistrationView } from './views/RegistrationView';
import { AdminDashboard } from './views/AdminDashboard';
import { TvDisplay } from './views/TvDisplay';
import { PublicTeamsView } from './views/PublicTeamsView';
import { TreeEditor } from './views/TreeEditor';
import { HistoryView } from './views/HistoryView';
import { WinnerView } from './views/WinnerView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegistrationView />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/tree" element={<TreeEditor />} />
        <Route path="/tv" element={<TvDisplay />} />
        <Route path="/teams" element={<PublicTeamsView />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/winner" element={<WinnerView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
