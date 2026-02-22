import { Routes, Route } from 'react-router-dom';
import { ReceivePage } from './pages/ReceivePage';
import { AccountsPage } from './pages/AccountsPage';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    document.body.className = "bg-black text-white antialiased overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200";
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#000000');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#000000';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<ReceivePage />} />
      <Route path="/accounts" element={<AccountsPage />} />
    </Routes>
  );
}

export default App;
