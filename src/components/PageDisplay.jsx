import React, { useEffect, useState, useRef } from 'react';

const PageDisplay = ({ pageNumber }) => {
  const [svgContent, setSvgContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  const formatPageNumber = (num) => String(num).padStart(3, '0');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchSvg = async () => {
      try {
        const response = await fetch(`/assets/warsh/svg/${formatPageNumber(pageNumber)}.svg`);
        if (!response.ok) throw new Error('فشل تحميل الصفحة');
        const text = await response.text();
        
        if (isMounted) {
          setSvgContent(text);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchSvg();
    return () => { isMounted = false; };
  }, [pageNumber]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg');
      if (!svgElement) return;

      const polygons = svgElement.querySelectorAll('.ayahPolygon');
      
      const handleClick = (e) => {
        const poly = e.currentTarget;
        const surah = poly.getAttribute('surah');
        const ayah = poly.getAttribute('ayah');
        
        console.log(`Surah: ${surah}, Ayah: ${ayah}`);
        
        // Remove active class from others
        polygons.forEach(p => p.classList.remove('active'));
        // Add to clicked
        poly.classList.add('active');
      };

      polygons.forEach(poly => {
        poly.addEventListener('click', handleClick);
      });

      return () => {
        polygons.forEach(poly => {
          poly.removeEventListener('click', handleClick);
        });
      };
    }
  }, [loading, svgContent]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-full max-w-[600px] h-[800px] skeleton rounded-xl opacity-20"></div>
        <p className="text-slate-400 animate-pulse">جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500 gap-4">
        <p className="text-xl font-bold">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-quran-highlight text-slate-800 rounded-lg"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="quran-page-container bg-white shadow-2xl rounded-lg border border-quran-border overflow-hidden transition-all duration-300 transform"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

export default PageDisplay;
