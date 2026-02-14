import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface ScrollWheelProps {
  isOpen: boolean;
  onClose: () => void;
  dates: string[];
  currentIndex: number;
  onSelectDate: (index: number) => void;
}

export function ScrollWheel({ isOpen, onClose, dates, currentIndex, onSelectDate }: ScrollWheelProps) {
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 60;

  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Scroll to current selected index on open
      containerRef.current.scrollTop = currentIndex * itemHeight;
    }
  }, [isOpen, currentIndex]);

  const handleScroll = () => {
    if (!containerRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);

    if (index >= 0 && index < dates.length && index !== selectedIndex) {
      setSelectedIndex(index);
      // Optional: Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
  };

  const handleConfirm = () => {
    onSelectDate(selectedIndex);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    return { day, month, weekday };
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-80 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Select Date</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Circular Scroll Wheel */}
        <div className="relative h-64 mb-6">
          {/* Selection indicator */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 bg-blue-50 border-y-2 border-blue-500 pointer-events-none z-10 rounded-lg" />

          {/* Fade gradients */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-20" />
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-20" />

          {/* Scroll container */}
          <div
            ref={containerRef}
            className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth relative z-30 no-scrollbar py-[100px]"
            onScroll={handleScroll}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {dates.map((date, index) => {
              const { day, month, weekday } = formatDate(date);
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={index}
                  className="h-[60px] snap-center flex items-center justify-between px-8"
                  onClick={() => {
                    if (containerRef.current) {
                      containerRef.current.scrollTo({
                        top: index * itemHeight,
                        behavior: 'smooth'
                      });
                    }
                  }}
                >
                  <div className={`flex items-baseline gap-2 transition-all duration-200 ${isSelected ? 'scale-110 opacity-100 translate-x-1' : 'scale-90 opacity-40'}`}>
                    <span
                      className={`text-4xl font-bold ${isSelected ? 'text-blue-600' : 'text-gray-800'}`}
                    >
                      {day}
                    </span>
                    <span
                      className={`text-lg font-medium ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}
                    >
                      {month}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors duration-200 ${isSelected ? 'text-blue-500 opacity-100' : 'text-gray-400 opacity-40'}`}
                  >
                    {weekday}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
        >
          Confirm Date
        </button>
      </div>
    </div>
  );
}
