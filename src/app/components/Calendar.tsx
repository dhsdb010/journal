import { useMemo } from "react";
import type { CalendarEvent, EventType } from "./EventModal";
import type { ThemeColors } from "./ThemeSwitcher";

interface CalendarProps {
  events: CalendarEvent[];
  onDateClick: (date: string) => void;
  year: number;
  theme: ThemeColors;
}

export function Calendar({ events, onDateClick, year, theme }: CalendarProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

  // Calculate calendar data for the year
  const calendarData = useMemo(() => {
    const data: { month: number; days: (number | null)[] }[] = [];

    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Adjust for Monday start (0 = Sunday -> 6, 1 = Monday -> 0, etc.)
      const mondayFirstDay = firstDay === 0 ? 6 : firstDay - 1;

      const days: (number | null)[] = [];
      for (let i = 0; i < mondayFirstDay; i++) {
        days.push(null);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
      }

      data.push({ month, days });
    }

    return data;
  }, [year]);

  const getDateString = (month: number, day: number) => {
    const date = new Date(year, month, day);
    return date.toISOString().split("T")[0];
  };

  const getEventsForDate = (month: number, day: number) => {
    const dateStr = getDateString(month, day);
    return events.filter((event) => event.date === dateStr);
  };

  const getEventColor = (type: EventType) => {
    switch (type) {
      case "happiness":
        return "#f97316"; // orange-500
      case "sadness":
        return "#7dd3fc"; // sky-300
      case "fear":
        return "#facc15"; // yellow-400
      case "disgust":
        return "#86efac"; // green-300
      case "anger":
        return "#a855f7"; // purple-500
      case "surprise":
        return "#ec4899"; // pink-500
      case "idk":
        return "#9ca3af"; // gray-400
      case "so-so":
        return "#ef4444"; // red-500
    }
  };

  const isMonday = (month: number, day: number | null) => {
    if (!day) return false;
    const date = new Date(year, month, day);
    return date.getDay() === 1;
  };

  return (
    <div className="w-full min-h-screen pb-20 relative" style={{ backgroundColor: theme.background }}>
      {/* Header with year */}
      <div className="sticky top-0 z-10 py-4 md:py-8 px-4 md:px-8" style={{ backgroundColor: theme.headerBg, color: theme.headerText }}>
        <h1 className="font-['PP_Neue_Montreal:Bold',sans-serif] tracking-[-4px] md:tracking-[-9px]" style={{ fontSize: 'clamp(48px, 12vw, 89px)', lineHeight: '0.8' }}>
          {year}
        </h1>
      </div>

      {/* Legend */}
      <div className="fixed top-16 md:top-[140px] right-2 md:right-8 z-20 rounded-lg shadow-lg group hover:p-4 p-2 transition-all cursor-pointer" style={{ backgroundColor: theme.legendBg }}>
        <h3 className="font-semibold mb-2 group-hover:block hidden text-xs md:text-base" style={{ color: theme.text }}>Emotions:</h3>
        <div className="group-hover:grid group-hover:grid-cols-2 group-hover:gap-2 md:group-hover:gap-3 hidden">
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-orange-500" />
            <span className="text-xs md:text-sm" style={{ color: theme.text }}>Happiness</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-sky-300" />
            <span className="text-xs md:text-sm" style={{ color: theme.text }}>Sadness</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-400" />
            <span className="text-xs md:text-sm" style={{ color: theme.text }}>Fear</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-300" />
            <span className="text-xs md:text-sm" style={{ color: theme.text }}>Disgust</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-purple-500" />
            <span className="text-xs md:text-sm" style={{ color: theme.text }}>Anger</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-pink-500" />
            <span className="text-xs md:text-sm" style={{ color: theme.text }}>Surprise</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-400" />
            <span className="text-xs md:text-sm" style={{ color: theme.text }}>IDK</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500" />
            <span className="text-xs md:text-sm" style={{ color: theme.text }}>So-So</span>
          </div>
        </div>
        <div className="flex gap-1 flex-wrap group-hover:hidden max-w-[60px] md:max-w-[120px]">
          <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-orange-500" />
          <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-sky-300" />
          <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-400" />
          <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-300" />
          <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-purple-500" />
          <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-pink-500" />
          <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-400" />
          <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500" />
        </div>
      </div>

      {/* Months stacked vertically */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-6 md:space-y-12">
        {calendarData.map(({ month, days }) => (
          <div key={month} className="border-t pt-4 md:pt-8" style={{ borderTopWidth: '0.5px', borderColor: theme.separatorLine }}>
            {/* Month name */}
            <h2 className="font-['PP_Neue_Montreal:Bold',sans-serif] mb-3 md:mb-6 tracking-tight" style={{ fontSize: 'clamp(24px, 6vw, 48px)', color: theme.text }}>
              {monthNames[month]}
            </h2>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-3">
              {/* Day headers */}
              {daysOfWeek.map((day, idx) => (
                <div
                  key={idx}
                  className="text-center font-['PP_Neue_Montreal:Medium',sans-serif] pb-2 md:pb-3"
                  style={{ fontSize: 'clamp(12px, 3vw, 20px)', color: idx === 0 ? theme.mondayHighlight : theme.text }}
                >
                  {day}
                </div>
              ))}

              {/* Days */}
              {days.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} />;
                }

                const isCurrentMonday = isMonday(month, day);
                const dayEvents = getEventsForDate(month, day);
                const hasEvents = dayEvents.length > 0;

                const today = new Date();
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

                return (
                  <button
                    key={idx}
                    onClick={() => onDateClick(getDateString(month, day))}
                    className="relative p-1 md:p-3 text-center transition-colors rounded-lg group"
                    style={{
                      color: isCurrentMonday ? theme.mondayHighlight : theme.text,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span
                      className={`font-['PP_Neue_Montreal:Medium',sans-serif] relative inline-block ${isToday ? 'underline decoration-2 underline-offset-4' : ''}`}
                      style={{ fontSize: 'clamp(18px, 5vw, 42px)', lineHeight: '1' }}
                    >
                      {day}
                      {/* Event indicators */}
                      {hasEvents && (
                        <span className="absolute -right-0.5 md:-right-1 -top-0.5 md:-top-1 flex gap-0.5 md:gap-1">
                          {Array.from(
                            new Set(dayEvents.map((event) => event.eventType))
                          ).map((type, typeIdx) => (
                            <span
                              key={`${month}-${day}-${type}-${typeIdx}`}
                              className="w-[5px] h-[5px] md:w-[8px] md:h-[8px] rounded-full"
                              style={{ backgroundColor: getEventColor(type) }}
                            />
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}