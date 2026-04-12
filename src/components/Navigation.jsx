import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';

const Navigation = ({ currentPage, totalPages, onPageChange }) => {
  const [inputValue, setInputValue] = useState(currentPage);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    const pageNum = parseInt(value, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    }
  };

  // Synchronize input value with currentPage prop when navigation happens via buttons
  React.useEffect(() => {
    setInputValue(currentPage);
  }, [currentPage]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-quran-border p-4 shadow-lg z-50">
      <div className="max-w-screen-md mx-auto flex items-center justify-between gap-4">
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-full hover:bg-quran-paper disabled:opacity-30 transition-colors"
          title="الصفحة التالية"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="page-input" className="hidden sm:inline text-sm font-medium text-slate-500">
            الصفحة
          </label>
          <div className="relative flex items-center">
            <input
              id="page-input"
              type="number"
              min="1"
              max={totalPages}
              value={inputValue}
              onChange={handleInputChange}
              className="w-16 sm:w-20 text-center py-1 px-2 border border-quran-border rounded-lg bg-quran-paper focus:ring-2 focus:ring-quran-highlight focus:outline-none font-bold"
            />
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-600 font-medium">{totalPages}</span>
          </div>
        </div>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-full hover:bg-quran-paper disabled:opacity-30 transition-colors"
          title="الصفحة السابقة"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Navigation;
