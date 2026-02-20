"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { CoursePack, PaymentStatus, Student } from "@/lib/types"; // Added for lesson dialog
import { Trash2, ArchiveIcon, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

// Added Lesson interface (similar to page.tsx)
interface Lesson {
  _id: string;
  student: Student;
  date: string;
  amount: number;
  comment?: string;
  isPaid?: boolean;
  packId?: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // State for "Nouvel élève" dialog
  const [openNewStudentDialog, setOpenNewStudentDialog] = useState(false);
  const [loadingNewStudent, setLoadingNewStudent] = useState(false);
  const [newStudentFormData, setNewStudentFormData] = useState({
    name: "",
    rate: "60",
    phone: "",
    address: "",
    courseDay: "",
    courseHour: "",
  });

  // State for "Nouveau cours" dialog
  const [openNewLessonDialog, setOpenNewLessonDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [packs, setPacks] = useState<{ [key: string]: CoursePack[] }>({});
  const [selectedStudentForLesson, setSelectedStudentForLesson] = useState<string>("");
  const [lessonType, setLessonType] = useState<"full" | "half">("full");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ isPaid: true });
  const [lessonComment, setLessonComment] = useState("");
  const [loadingNewLesson, setLoadingNewLesson] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Common state
  const [students, setStudents] = useState<Student[]>([]);

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les cours",
      });
    }
  }, [toast]);

  const fetchStudentPacks = useCallback(
    async (studentId: string) => {
      if (!studentId) return;
      try {
        const response = await fetch(`/api/students/${studentId}/packs`);
        if (!response.ok) throw new Error("Error fetching packs");
        const data = await response.json();
        setPacks((prev) => ({
          ...prev,
          [studentId]: data.filter((pack: CoursePack) => pack.remainingLessons > 0),
        }));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les packs de cours",
        });
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchStudents();
    fetchLessons(); // Fetch lessons on initial load
  }, [fetchStudents, fetchLessons]);

  useEffect(() => {
    if (selectedStudentForLesson) {
      fetchStudentPacks(selectedStudentForLesson);
    }
  }, [selectedStudentForLesson, fetchStudentPacks]);

  const handleNewStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNewStudent(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newStudentFormData),
      });

      if (!response.ok) throw new Error("Error creating student");

      await fetchStudents();
      setOpenNewStudentDialog(false);
      setNewStudentFormData({
        name: "",
        rate: "60",
        phone: "",
        address: "",
        courseDay: "",
        courseHour: "",
      });
      toast({
        title: "Succès",
        description: "Élève ajouté avec succès",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter l'élève",
      });
    } finally {
      setLoadingNewStudent(false);
    }
  };

  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForLesson) return;

    setLoadingNewLesson(true);
    const student = students.find((s) => s._id === selectedStudentForLesson);
    const fullRate = student?.rate || 0;
    const amount = lessonType === "full" ? fullRate : fullRate / 2;

    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentForLesson,
          date: new Date().toISOString(),
          amount: amount,
          comment: lessonComment.trim() || undefined,
          isPaid: paymentStatus.isPaid,
          packId: paymentStatus.packId,
        }),
      });

      if (!response.ok) throw new Error("Error creating lesson");

      await fetchLessons(); // Re-fetch lessons
      if (paymentStatus.packId) {
        await fetchStudentPacks(selectedStudentForLesson); // Re-fetch packs if one was used
      }
      setOpenNewLessonDialog(false);
      setSelectedStudentForLesson("");
      setLessonType("full");
      setPaymentStatus({ isPaid: true });
      setLessonComment("");
      toast({
        title: "Succès",
        description: "Cours ajouté avec succès",
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le cours",
      });
    } finally {
      setLoadingNewLesson(false);
    }
  };

  const handleDeleteStudent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error deleting student");

      await fetchStudents();
      toast({
        title: "Succès",
        description: "Élève supprimé avec succès",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'élève",
      });
    }
  };

  const handleArchiveStudent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ archived: true }),
      });

      if (!response.ok) throw new Error("Error archiving student");

      await fetchStudents();
      toast({
        title: "Succès",
        description: "Élève archivé avec succès",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'archiver l'élève",
      });
    }
  };

  const handleUnarchiveStudent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ archived: false }),
      });

      if (!response.ok) throw new Error("Error unarchiving student");

      await fetchStudents();
      toast({
        title: "Succès",
        description: "Élève désarchivé avec succès",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de désarchiver l'élève",
      });
    }
  };

  const selectedStudentDataForLesson = students.find((s) => s._id === selectedStudentForLesson);
  const studentPacksForLesson = selectedStudentForLesson ? packs[selectedStudentForLesson] || [] : [];
  const hasActivePacksForLesson = studentPacksForLesson.length > 0;
  const studentsToDisplay = showArchived
    ? students.filter((student) => student.archived)
    : students.filter((student) => !student.archived);

  const daysOfWeek = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const generateTimeSlots = () => {
    const slots = [];
    const startTime = new Date();
    startTime.setHours(10, 30, 0, 0);

    const endTime = new Date();
    endTime.setHours(19, 0, 0, 0);

    while (startTime <= endTime) {
      const hours = startTime.getHours().toString().padStart(2, '0');
      const minutes = startTime.getMinutes().toString().padStart(2, '0');
      slots.push(`${hours}:${minutes}`);
      startTime.setMinutes(startTime.getMinutes() + 15);
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {showArchived ? "Élèves Archivés" : "Élèves"}{" "}
          <span className="text-2xl font-semibold text-gray-500">({studentsToDisplay.length})</span>
        </h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Voir les actifs" : "Voir les archivés"}
          </Button>
          <Button onClick={() => setOpenNewStudentDialog(true)}>Nouvel élève</Button>
          <Button onClick={() => setOpenNewLessonDialog(true)}>Nouveau cours</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Tarif</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date d&apos;ajout</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentsToDisplay.map((student) => (
            <TableRow
              key={student._id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/students/${student._id}`)}
            >
              <TableCell>{student.name}</TableCell>
              <TableCell>{student.rate}€</TableCell>
              <TableCell>
                {student.declared ? (
                  <span className="text-green-600">Déclaré</span>
                ) : (
                  <span className="text-red-600">Non déclaré</span>
                )}
              </TableCell>
              <TableCell>{new Date(student.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right space-x-1">
                {showArchived ? (
                  <Button variant="ghost" size="icon" title="Désarchiver" onClick={(e) => handleUnarchiveStudent(e, student._id)}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" title="Archiver" onClick={(e) => handleArchiveStudent(e, student._id)}>
                    <ArchiveIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" title="Supprimer" onClick={(e) => handleDeleteStudent(e, student._id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialog for Nouvel élève */}
      <Dialog open={openNewStudentDialog} onOpenChange={setOpenNewStudentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel élève</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewStudentSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l&apos;élève</Label>
              <Input
                id="name"
                value={newStudentFormData.name}
                onChange={(e) => setNewStudentFormData({ ...newStudentFormData, name: e.target.value })}
                placeholder="Nom de l'élève"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input
                id="phone"
                value={newStudentFormData.phone}
                onChange={(e) => setNewStudentFormData({ ...newStudentFormData, phone: e.target.value })}
                placeholder="Numéro de téléphone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={newStudentFormData.address}
                onChange={(e) => setNewStudentFormData({ ...newStudentFormData, address: e.target.value })}
                placeholder="Adresse"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseDay">Jour du cours</Label>
              <Select
                value={newStudentFormData.courseDay}
                onValueChange={(value) => setNewStudentFormData({ ...newStudentFormData, courseDay: value })}
              >
                <SelectTrigger id="courseDay">
                  <SelectValue placeholder="Sélectionner un jour" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="courseHour">Heure du cours</Label>
              <Select
                value={newStudentFormData.courseHour}
                onValueChange={(value) => setNewStudentFormData({ ...newStudentFormData, courseHour: value })}
              >
                <SelectTrigger id="courseHour">
                  <SelectValue placeholder="Sélectionner une heure" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tarif du cours</Label>
              <RadioGroup
                value={newStudentFormData.rate}
                onValueChange={(value) => setNewStudentFormData({ ...newStudentFormData, rate: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="31,5" id="rate31_5" />
                  <Label htmlFor="rate31_5">31,5€</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="35" id="rate35" />
                  <Label htmlFor="rate35">35€</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="50" id="rate50" />
                  <Label htmlFor="rate50">50€</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="60" id="rate60" />
                  <Label htmlFor="rate60">60€</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpenNewStudentDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loadingNewStudent}>
                {loadingNewStudent ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Nouveau cours */}
      <Dialog open={openNewLessonDialog} onOpenChange={setOpenNewLessonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau cours</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitLesson} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="studentLesson">Élève</Label>
              <Select value={selectedStudentForLesson} onValueChange={setSelectedStudentForLesson}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un élève" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name} - {student.rate}€
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStudentDataForLesson && (
              <div className="space-y-2">
                <Label>Type de cours</Label>
                <RadioGroup
                  value={lessonType}
                  onValueChange={(value) => setLessonType(value as "full" | "half")}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="lessonFull" />
                    <Label htmlFor="lessonFull">Cours complet ({selectedStudentDataForLesson.rate}€)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="half" id="lessonHalf" />
                    <Label htmlFor="lessonHalf">Demi-cours ({selectedStudentDataForLesson.rate / 2}€)</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label>Paiement</Label>
              <RadioGroup
                value={
                  hasActivePacksForLesson && paymentStatus.packId
                    ? "pack"
                    : paymentStatus.isPaid
                    ? "paid"
                    : "unpaid"
                }
                onValueChange={(value) => {
                  if (value === "pack" && studentPacksForLesson.length > 0) {
                    setPaymentStatus({
                      isPaid: true,
                      packId: studentPacksForLesson[0]._id, // Default to first pack
                    });
                  } else {
                    setPaymentStatus({ isPaid: value === "paid", packId: undefined });
                  }
                }}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paid" id="lessonPaid" />
                  <Label htmlFor="lessonPaid">Payé</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unpaid" id="lessonUnpaid" />
                  <Label htmlFor="lessonUnpaid">Non payé</Label>
                </div>
                {hasActivePacksForLesson && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pack" id="lessonPack" />
                    <Label htmlFor="lessonPack">Utiliser un pack</Label>
                  </div>
                )}
              </RadioGroup>

              {hasActivePacksForLesson && paymentStatus.packId && (
                <div className="mt-2">
                  <Label htmlFor="packSelectLesson">Sélectionner un pack</Label>
                  <Select
                    value={paymentStatus.packId}
                    onValueChange={(value) => setPaymentStatus({ ...paymentStatus, packId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentPacksForLesson.map((pack) => (
                        <SelectItem key={pack._id} value={pack._id}>
                          Pack de {pack.totalLessons} cours - {pack.remainingLessons} restants
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lessonComment">Commentaire (optionnel)</Label>
              <Textarea
                id="lessonComment"
                placeholder="Ajouter un commentaire..."
                value={lessonComment}
                onChange={(e) => setLessonComment(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpenNewLessonDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loadingNewLesson || !selectedStudentForLesson}>
                {loadingNewLesson ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
