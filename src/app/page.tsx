"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { AddLessonDialog } from "@/components/lesson/AddLessonDialog"; // Import the new component
import { Student, Lesson } from "@/lib/types";

export default function DashboardPage() {
  const [isAddLessonDialogOpen, setIsAddLessonDialogOpen] = useState(false); // State to control the dialog
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  // Removed states managed by AddLessonDialog: loading, packs, selectedStudent, lessonType, paymentStatus, comment, lessonDate
  const { toast } = useToast();

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students");
      const data = await response.json();
      setStudents(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les élèves",
      });
    }
  }, [toast]);

  const fetchLessons = useCallback(async () => {
    try {
      const response = await fetch("/api/lessons");
      const data = await response.json();
      setLessons(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les cours",
      });
    }
  }, [toast]);

  // Removed fetchStudentPacks - it's now inside AddLessonDialog

  useEffect(() => {
    fetchStudents();
    fetchLessons();
  }, [fetchStudents, fetchLessons]);

  // Removed useEffect for fetching packs

  // Removed handleSubmit - it's now inside AddLessonDialog

  // Callback for the dialog to refresh lessons
  const handleLessonAdded = () => {
    fetchLessons();
  };

  // Statistics calculation remains the same
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyLessons = lessons.filter((lesson) => {
    const lessonDate = new Date(lesson.date);
    return lessonDate.getMonth() === currentMonth && lessonDate.getFullYear() === currentYear;
  });

  const monthlyRevenue = monthlyLessons.reduce((sum, lesson) => sum + lesson.amount, 0);

  const quarterStart = currentMonth - (currentMonth % 3);
  const quarterlyLessons = lessons.filter((lesson) => {
    const lessonDate = new Date(lesson.date);
    return (
      lessonDate.getMonth() >= quarterStart &&
      lessonDate.getMonth() < quarterStart + 3 &&
      lessonDate.getFullYear() === currentYear
    );
  });

  const quarterlyRevenue = quarterlyLessons.reduce((sum, lesson) => sum + lesson.amount, 0);

  // Removed selectedStudentData, studentPacks, hasActivePacks - they are managed within the dialog

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <Button onClick={() => setIsAddLessonDialogOpen(true)}>Ajouter un cours</Button> {/* Update onClick */}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Élèves actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{students.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CA du mois</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{monthlyRevenue}€</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CA du trimestre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{quarterlyRevenue}€</p>
          </CardContent>
        </Card>
      </div>

      {/* Use the new AddLessonDialog component */}
      <AddLessonDialog
        students={students}
        isOpen={isAddLessonDialogOpen}
        onClose={() => setIsAddLessonDialogOpen(false)}
        onLessonAdded={handleLessonAdded}
      />

      <Toaster />
    </div>
  );
}
