import { useState, useEffect } from "react";
import { Calendar } from "./components/Calendar";
import { DailyView } from "./components/DailyView";
import { EventModal, CalendarEvent } from "./components/EventModal";
import { ThemeSwitcher, Theme, themes } from "./components/ThemeSwitcher";
import { ScrollWheel } from "./components/ScrollWheel";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { dbRequest } from "../utils/db";

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentYear] = useState(2026);
  const [currentTheme, setCurrentTheme] = useState<Theme>("white");
  const [viewMode, setViewMode] = useState<"year" | "daily">("year");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isScrollWheelOpen, setIsScrollWheelOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Load events from IndexedDB on mount (and migrate from LocalStorage if needed)
  useEffect(() => {
    const loadEvents = async () => {
      // 1. Check LocalStorage for legacy data
      const legacyEvents = localStorage.getItem("calendarEvents");
      if (legacyEvents) {
        try {
          const parsed: CalendarEvent[] = JSON.parse(legacyEvents);
          // Migrate to DB
          for (const ev of parsed) {
            await dbRequest.saveEvent(ev);
          }
          // Clear LocalStorage to prevent re-migration
          localStorage.removeItem("calendarEvents");
          console.log("Migrated events from LocalStorage to IndexedDB");
        } catch (error) {
          console.error("Migration failed:", error);
        }
      }

      // 2. Load from DB
      const dbEvents = await dbRequest.getAllEvents();
      setEvents(dbEvents as CalendarEvent[]);
    };

    loadEvents();

    // Theme loading remains the same
    const savedTheme = localStorage.getItem("calendarTheme") as Theme;
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);


  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("calendarTheme", currentTheme);
  }, [currentTheme]);

  const handleDateClick = (date: string) => {
    const [, m, d] = date.split('-').map(Number);
    // Determine the month and day based on the clicked date string
    // We update the global currentMonth state so the DailyView renders the correct month
    setCurrentMonth(m - 1);
    setCurrentDayIndex(d - 1);
    setViewMode("daily");
  };

  const getEventsForDate = (date: string) => {
    return events.filter((event) => event.date === date);
  };

  const handleSaveEvent = async (event: Omit<CalendarEvent, "id">) => {
    // Create new event
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

    // Save to State
    setEvents(prev => [...prev, newEvent]);
    // Save to DB
    await dbRequest.saveEvent(newEvent);
    setIsModalOpen(false);
  };

  const handleDeleteEvent = async (id: string) => {
    setEvents(prev => prev.filter((event) => event.id !== id));
    await dbRequest.deleteEvent(id);
    setIsModalOpen(false);
  };

  const handleUpdateEvent = async (id: string, updatedEvent: Omit<CalendarEvent, "id">) => {
    const fullEvent = { ...updatedEvent, id };

    setEvents(prev => prev.map((event) =>
      event.id === id ? fullEvent : event
    ));
    await dbRequest.saveEvent(fullEvent);
    setIsModalOpen(false);
  };

  // Generate all dates for current month
  const getDatesForMonth = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      dates.push(date.toISOString().split("T")[0]);
    }

    return dates;
  };

  const dates = getDatesForMonth();
  const currentDate = dates[currentDayIndex];

  const handlePrevDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else if (currentMonth > 0) {
      setCurrentMonth(currentMonth - 1);
      // Set to last day of previous month
      const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
      setCurrentDayIndex(prevMonthDays - 1);
    }
  };

  const handleNextDay = () => {
    if (currentDayIndex < dates.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    } else if (currentMonth < 11) {
      setCurrentMonth(currentMonth + 1);
      setCurrentDayIndex(0);
    }
  };

  // Sync State -> URL Path (History API)
  useEffect(() => {
    const currentPath = window.location.pathname;
    let newPath = "/calendar";

    if (viewMode === "year") {
      newPath = "/calendar";
    } else {
      // In daily mode, persist the specific date
      // Use local time for formatted date string
      const d = new Date(currentYear, currentMonth, currentDayIndex + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      newPath = `/daily/${dateStr}`;
    }

    // Only push if different to avoid duplicate history entries
    if (currentPath !== newPath) {
      window.history.pushState({}, "", newPath);
    }
  }, [viewMode, currentMonth, currentDayIndex, currentYear]);

  // Listen for Browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;

      if (path.startsWith("/daily/")) {
        const dateStr = path.split("/daily/")[1]; // "YYYY-MM-DD"
        if (dateStr) {
          // Append T00:00:00 to ensure local time parsing
          const date = new Date(dateStr + "T00:00:00");
          if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
            setCurrentMonth(date.getMonth());
            setCurrentDayIndex(date.getDate() - 1);
            setViewMode("daily");
            return;
          }
        }
      }

      // Fallback to year view for /calendar, /, or invalid paths
      setViewMode("year");
    };

    // Initial check on mount
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      // Redirect root to /calendar
      window.history.replaceState({}, "", "/calendar");
      setViewMode("year");
    } else {
      // Handle initial path (e.g. reload on /daily/...)
      handlePopState();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentYear]);

  const handleScrollWheelSelect = (index: number) => {
    setCurrentDayIndex(index);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: themes[currentTheme].background }}>
      {/* View Mode Toggle */}
      {viewMode === "daily" && (
        <div className="fixed top-4 right-4 z-30 flex gap-2 bg-white rounded-lg shadow-lg p-1">
          <button
            onClick={() => setViewMode("year")}
            className="p-2 rounded transition-colors hover:bg-gray-100"
            title="Back to Year View"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {viewMode === "year" ? (
        <Calendar
          events={events}
          onDateClick={handleDateClick}
          year={currentYear}
          theme={themes[currentTheme]}
        />
      ) : (
        <div className="relative w-full h-screen overflow-hidden">
          {/* Full Page Daily View */}
          <DailyView
            date={currentDate}
            events={getEventsForDate(currentDate)}
            onDateClick={() => handleDateClick(currentDate)}
            theme={themes[currentTheme]}
            onAddEvent={() => {
              setEditingEvent(null);
              setIsModalOpen(true);
            }}
            onEditEvent={(event) => {
              setEditingEvent(event);
              setIsModalOpen(true);
            }}
          />

          {/* Navigation Arrows */}
          <button
            onClick={handlePrevDay}
            disabled={currentDayIndex === 0 && currentMonth === 0}
            className="fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center z-20 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNextDay}
            disabled={currentDayIndex === dates.length - 1 && currentMonth === 11}
            className="fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center z-20 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Date Counter */}
          <button
            onClick={() => setIsScrollWheelOpen(true)}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-gray-200 text-sm font-semibold z-20 hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 group"
          >
            <span className="text-gray-500 font-normal">Day</span>
            <span className="text-gray-900 text-lg">{currentDayIndex + 1}</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500">{dates.length}</span>
          </button>

          {/* Scroll Wheel Picker */}
          <ScrollWheel
            isOpen={isScrollWheelOpen}
            onClose={() => setIsScrollWheelOpen(false)}
            dates={dates}
            currentIndex={currentDayIndex}
            onSelectDate={handleScrollWheelSelect}
          />
        </div>
      )}

      <ThemeSwitcher currentTheme={currentTheme} onThemeChange={setCurrentTheme} />

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={viewMode === "daily" ? currentDate : null}
        existingEvent={editingEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onUpdate={handleUpdateEvent}
      />
    </div>
  );
}