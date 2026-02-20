"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useEffect, useMemo, useState } from "react";

interface Student {
  _id: string;
  name: string;
  rate: number;
  declared: boolean;
}

interface Lesson {
  _id: string;
  student: Student;
  date: string;
  amount: number;
}

export default function FinancesPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();

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

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const months = Array.from({ length: 12 }, (_, i) => {
    return {
      value: i,
      label: new Date(0, i).toLocaleString('fr-FR', { month: 'long' }),
    };
  });

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    lessons.forEach((lesson) => {
      years.add(new Date(lesson.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [lessons]);

  // Memoize filtered lessons
  const filteredLessons = useMemo(() => {
    const currentDate = new Date();
    const targetYear = selectedYear;
    let startMonth: number;
    let endMonth: number;

    const referenceMonth = selectedMonth !== null ? selectedMonth : currentDate.getMonth();

    if (period === "month") {
      startMonth = referenceMonth;
      endMonth = referenceMonth;
    } else if (period === "quarter") {
      startMonth = referenceMonth - (referenceMonth % 3);
      endMonth = startMonth + 2;
    } else { // period === "year"
      startMonth = 0;
      endMonth = 11;
    }

    return lessons.filter((lesson) => {
      const lessonDate = new Date(lesson.date);
      const lessonMonth = lessonDate.getMonth();
      const lessonYear = lessonDate.getFullYear();

      return (
        lessonYear === targetYear &&
        lessonMonth >= startMonth &&
        lessonMonth <= endMonth
      );
    });
  }, [lessons, period, selectedMonth, selectedYear]);

  // Memoize derived calculations
  const totalRevenue = useMemo(() => filteredLessons.reduce((sum, lesson) => sum + lesson.amount, 0), [filteredLessons]);

  const declaredRevenue = useMemo(() => filteredLessons.reduce((sum, lesson) => {
    if (lesson.student.declared) {
      return sum + lesson.amount;
    }
    return sum;
  }, 0), [filteredLessons]);

  const taxableRevenue = useMemo(() => declaredRevenue * 0.75, [declaredRevenue]); // 25% tax reduction
  const totalLessons = useMemo(() => filteredLessons.length, [filteredLessons]);

  // Calculate the number of lessons and unique students per price
  const lessonsAndStudentsByPrice = useMemo(() => filteredLessons.reduce((acc: { [key: number]: { lessons: number; students: Set<string> } }, lesson) => {
    const price = lesson.amount;
    const studentId = lesson.student._id; // Assuming student object has an _id

    if (!acc[price]) {
      acc[price] = { lessons: 0, students: new Set<string>() };
    }

    acc[price].lessons += 1;
    // Ensure studentId is valid before adding
    if (studentId) {
      acc[price].students.add(studentId);
    }


    return acc;
  }, {}), [filteredLessons]);

  const novaLessons = useMemo(() => filteredLessons.filter(lesson => lesson.amount === 60), [filteredLessons]);
  const novaLessonsCount = useMemo(() => novaLessons.length, [novaLessons]);
  const novaRevenue = useMemo(() => novaLessons.reduce((sum, lesson) => sum + lesson.amount, 0), [novaLessons]);

  // Calculate the total amount of lessons that are not taxed
  const totalNonTaxedLessons = useMemo(() => filteredLessons.filter(lesson => !lesson.student.declared).reduce((sum, lesson) => sum + lesson.amount, 0), [filteredLessons]);

  const totalTotal = useMemo(() => taxableRevenue + totalNonTaxedLessons, [taxableRevenue, totalNonTaxedLessons]);

  const handlePeriodChange = (newPeriod: "month" | "quarter" | "year") => {
    setPeriod(newPeriod);
  };

  return (
    <div className="container py-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-4">
            <Button
              variant={period === "month" ? "default" : "ghost"}
              onClick={() => handlePeriodChange("month")}
            >
              Mois
            </Button>
            <Button
              variant={period === "quarter" ? "default" : "ghost"}
              onClick={() => handlePeriodChange("quarter")}
            >
              Trimestre
            </Button>
            <Button
              variant={period === "year" ? "default" : "ghost"}
              onClick={() => handlePeriodChange("year")}
            >
              Année
            </Button>
          </div>
          <div className="flex space-x-2">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth?.toString() || ""}
              onValueChange={(value) => setSelectedMonth(value === "null" ? null : parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner un mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Tous les mois</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>CA Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalRevenue}€</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CA Déclaré</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{declaredRevenue}€</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CA Imposable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{taxableRevenue.toFixed(2)}€</p>
              <p className="text-sm text-muted-foreground">Après abattement 25%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalTotal.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Nombre de cours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalLessons}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CA Cash</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalNonTaxedLessons}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CA NOVA à déclarer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{novaRevenue}€</p>
              <p className="text-sm text-muted-foreground">{novaLessonsCount} cours à 60€</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cours / Élèves par Prix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(lessonsAndStudentsByPrice).map(([price, data]) => (
                  <div key={price} className="flex flex-col items-center p-2 border rounded-md text-center">
                    <span className="font-semibold">{price}€:</span>
                    <span className="text-sm">{data.lessons} cours</span>
                    <span className="text-sm text-muted-foreground">{data.students.size} élève(s)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DATE</TableHead>
              <TableHead>ÉLÈVE</TableHead>
              <TableHead>DÉCLARÉ</TableHead>
              <TableHead className="text-right">MONTANT</TableHead>
              <TableHead className="text-right">MONTANT IMPOSABLE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLessons.map((lesson) => (
              <TableRow key={lesson._id}>
                <TableCell>{format(new Date(lesson.date), 'PPP', { locale: fr })}</TableCell>
                <TableCell>{lesson.student.name}</TableCell>
                <TableCell>
                  {lesson.student.declared ? (
                    <span className="text-green-600">Oui</span>
                  ) : (
                    <span className="text-red-600">Non</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{lesson.amount}€</TableCell>
                <TableCell className="text-right">
                  {lesson.student.declared ? `${(lesson.amount * 0.75).toFixed(2)}€` : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Toaster />
    </div>
  );
}
