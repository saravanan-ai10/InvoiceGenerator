import React, { useEffect, useRef, useState } from 'react';

export default function ResponsivePreview({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(1122);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === containerRef.current) {
          const { width } = entry.contentRect;
          const targetWidth = 794;
          if (width < targetWidth) {
            setScale(width / targetWidth);
          } else {
            setScale(Math.min(width / targetWidth, 1));
          }
        } else if (entry.target === contentRef.current) {
          setContentHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(containerRef.current);
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full lg:flex-1 shrink-0 bg-slate-200 rounded-xl overflow-auto p-4 sm:p-8 min-h-[400px] flex justify-center items-start max-w-full min-w-0">
      <div 
        className="w-full max-w-[794px] flex justify-center origin-top-center"
      >
        <div 
          ref={contentRef}
          className="shadow-xl rounded-sm bg-white shrink-0 origin-top" 
          style={{ 
            transform: `scale(${scale})`, 
            width: '794px',
            transformOrigin: 'top center',
            marginBottom: `-${(1 - scale) * contentHeight}px`
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
