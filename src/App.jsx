import React, { useState, useEffect } from 'react';
import PageDisplay from './components/PageDisplay';
import Navigation from './components/Navigation';
import { BookOpen } from 'lucide-react';

function App() {
  // Use state with initial value from localStorage or default to 1
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('warsh-mushaf-page');
    return saved ? parseInt(saved, 10) : 1;
  });

  const totalPages = 604;

  // Persist page change
  useEffect(() => {
    localStorage.setItem('warsh-mushaf-page', currentPage);
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="min-h-screen bg-quran-paper flex flex-col items-center">
      {/* Header */}
      <header className="w-full bg-white/70 backdrop-blur-md border-b border-quran-border px-6 py-4 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-quran-highlight p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-slate-800" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 font-arabic">
              مصحف ورش الرقمي
            </h1>
          </div>
          
          <div className="hidden sm:block text-slate-500 font-medium">
            رواية ورش عن نافع
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-screen-xl px-4 py-8 mb-24 flex justify-center items-start">
        <PageDisplay pageNumber={currentPage} />
      </main>

      {/* Bottom Navigation */}
      <Navigation 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={handlePageChange} 
      />
    </div>
  );
}

export default App;
