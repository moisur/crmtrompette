"use client";

import { useState, useEffect, useMemo } from "react";
import { Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const daysOfWeek = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

// Helper to get the start of the week (Monday)
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

export default function AgendaPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch("/api/students");
        if (!response.ok) throw new Error("Failed to fetch students");
        const data = await response.json();
        // Filter for students who have a scheduled course day and are not archived
        setStudents(data.filter((s: Student) => s.courseDay && s.courseHour && !s.archived));
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchStudents();
  }, []);

  const handleNextWeek = () => {
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)));
  };

  const handlePreviousWeek = () => {
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)));
  };
  
  const handleGoToStudent = (studentId: string) => {
    router.push(`/students/${studentId}`);
  };

  const PIXELS_PER_HOUR = 64; // Increased for better visibility
  const AGENDA_START_HOUR = 9;
  const AGENDA_END_HOUR = 20;

  const weekDates = useMemo(() => {
    const startOfWeek = getStartOfWeek(currentDate);
    return daysOfWeek.map((_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + index);
      return date.toLocaleDateString("fr-FR", { day: 'numeric', month: 'long' });
    });
  }, [currentDate]);

  const timeLabels = useMemo(() => {
    const labels = [];
    for (let i = AGENDA_START_HOUR; i <= AGENDA_END_HOUR; i++) {
      labels.push(`${i}:00`);
    }
    return labels;
  }, []);

  const getEventPosition = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const totalMinutes = (hour - AGENDA_START_HOUR) * 60 + minute;
    return (totalMinutes / 60) * PIXELS_PER_HOUR;
  };

  const processEventsForDay = (dayStudents: Student[]) => {
    if (dayStudents.length === 0) return [];

    const events = dayStudents.map(student => {
      const [hour, minute] = student.courseHour!.split(':').map(Number);
      const start = hour * 60 + minute;
      // Assuming 45 min duration for now
      const end = start + 45;
      return { ...student, start, end, columns: 1, left: 0 };
    }).sort((a, b) => a.start - b.start);

    const collisionGroups: typeof events[] = [];
    let currentGroup: typeof events = [];

    for (const event of events) {
      if (currentGroup.length === 0 || event.start < currentGroup[currentGroup.length - 1].end) {
        currentGroup.push(event);
      } else {
        collisionGroups.push(currentGroup);
        currentGroup = [event];
      }
    }
    collisionGroups.push(currentGroup);

    for (const group of collisionGroups) {
      for (let i = 0; i < group.length; i++) {
        let maxCols = 1;
        for (let j = i + 1; j < group.length; j++) {
          if (group[j].start < group[i].end) {
            maxCols++;
          }
        }
        group[i].columns = Math.max(group[i].columns, maxCols);
        let occupiedSlots = 0;
        for (let j = 0; j < i; j++) {
          if (group[j].start < group[i].end && group[i].start < group[j].end) {
             occupiedSlots++;
          }
        }
        group[i].left = occupiedSlots;
      }
    }
    
    return events;
  };


  return (
    <div className="container py-6 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Agenda</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold">
            Semaine du {weekDates[0]}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto border rounded-md bg-white">
        <div className="grid grid-cols-[auto_1fr]">
          {/* Corner */}
          <div className="sticky top-0 z-20 bg-background border-b border-r"></div>
          {/* Day Headers */}
          <div className="grid grid-cols-5 sticky top-0 z-20 bg-background">
            {daysOfWeek.map((day, index) => (
              <div key={day} className="text-center font-semibold py-2 border-b border-r">
                {day}
                <br />
                <span className="text-sm text-muted-foreground">{weekDates[index]}</span>
              </div>
            ))}
          </div>

          {/* Time Gutter */}
          <div className="row-span-2 border-r bg-background sticky left-0 z-10">
            {timeLabels.map(time => (
              <div key={time} className={`h-[${PIXELS_PER_HOUR}px] text-right pr-2 text-xs text-muted-foreground relative`}>
                 <span className="absolute -top-2 right-2">{time}</span>
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="grid grid-cols-5 relative">
            {/* Horizontal Lines */}
            {timeLabels.slice(1).map(time => (
              <div key={`line-${time}`} className="col-span-5 h-[${PIXELS_PER_HOUR}px] border-t"></div>
            ))}
             {/* Vertical Lines */}
            {daysOfWeek.slice(0, -1).map((day, index) => (
              <div key={`vline-${day}`} className="row-start-1 row-span-full h-full border-r" style={{ gridColumnStart: index + 1 }}></div>
            ))}


            {/* Events */}
            {daysOfWeek.map((day, dayIndex) => {
              const dayStudents = students.filter(student => student.courseDay === day);
              const processedEvents = processEventsForDay(dayStudents);
              return (
                <div key={day} className="col-start-auto relative" style={{ gridColumnStart: dayIndex + 1 }}>
                  {processedEvents.map(event => {
                    const width = 100 / event.columns;
                    const left = event.left * width;
                    return (
                      <div
                        key={event._id}
                        onClick={() => handleGoToStudent(event._id)}
                        className="absolute bg-blue-200 text-blue-900 border-l-4 border-blue-500 rounded-r-md p-1 text-xs cursor-pointer overflow-hidden shadow-sm"
                        style={{
                          top: `${getEventPosition(event.courseHour!)}px`,
                          height: `${(45 / 60) * PIXELS_PER_HOUR}px`, // 45 min duration
                          width: `calc(${width}% - 4px)`,
                          left: `${left}%`,
                          marginLeft: '2px',
                        }}
                      >
                        <p className="font-bold truncate">{event.name}</p>
                        <p className="truncate">{event.courseHour}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
