"use client";

import AttestationPreview from "@/components/invoice/AttestationPreview"; // Import the new component
import InvoiceForm from "@/components/invoice/InvoiceForm";
import InvoicePreview from "@/components/invoice/InvoicePreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { CoursePack, InvoiceData, Student } from "@/lib/types"; // Removed unused PaymentStatus
// import html2pdf from "html2pdf.js"; // Will be dynamically imported
import { ArrowLeft, Check, CreditCard, FileDown, Plus, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation"; // Import useParams
import { useCallback, useEffect, useState } from "react"; // Removed 'use'
import { AddLessonDialog } from "@/components/lesson/AddLessonDialog"; // Import the dialog component

// Define Student interface compatible with AddLessonDialog if not already imported/shared
// interface StudentForDialog {
//   _id: string;
//   name: string;
//   rate: number;
// }

interface Lesson {
  _id: string;
  date: string;
  amount: number;
  comment?: string;
  isPaid?: boolean;
  packId?: string;
}

// Removed Promise wrapper for params
export default function StudentPage() {
  const params = useParams(); // Use useParams hook
  const studentId = params.id as string; // Get id directly
  const [student, setStudent] = useState<Student | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]); // State for all students list
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [packs, setPacks] = useState<CoursePack[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null); // For regular invoice
  const [attestationData, setAttestationData] = useState<InvoiceData | null>(null); // For attestation
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showAttestationDialog, setShowAttestationDialog] = useState(false); // State for attestation dialog
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  // Removed showDeletePackDialog state
  const [showPayWithPackDialog, setShowPayWithPackDialog] = useState(false);
  const [isAddLessonDialogOpen, setIsAddLessonDialogOpen] = useState(false); // State for Add Lesson Dialog
  const [showEditStudentDialog, setShowEditStudentDialog] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  // Removed packToDelete state
  const [selectedLessons, setSelectedLessons] = useState<{
    [key: string]: boolean;
  }>({});
  const [selectedPackForPayment, setSelectedPackForPayment] = useState<string>("");
  const [packForm, setPackForm] = useState({
    totalLessons: "10",
    price: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
  });
  const [editStudentForm, setEditStudentForm] = useState({
    name: "",
    rate: "",
    phone: "",
    address: "",
    courseDay: "",
    courseHour: "",
  });
  const router = useRouter();
  const { toast } = useToast();

  const fetchStudent = useCallback(async () => {
    if (!studentId) return; // Add guard clause
    try {
      const response = await fetch(`/api/students/${studentId}`); // Use studentId
      if (!response.ok) throw new Error("Student not found");
      const data = await response.json();
      setStudent(data);
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les informations de l'élève",
      });
      router.push("/students");
    }
  }, [studentId, router, toast]); // Update dependency

  const fetchLessons = useCallback(async () => {
    if (!studentId) return; // Add guard clause
    try {
      const response = await fetch(`/api/students/${studentId}/lessons`); // Use studentId
      if (!response.ok) throw new Error("Error fetching lessons");
      const data = await response.json();
      setLessons(data);
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les cours de l'élève",
      });
    }
  }, [studentId, toast]); // Update dependency

  const fetchPacks = useCallback(async () => {
    if (!studentId) return; // Add guard clause
    try {
      const response = await fetch(`/api/students/${studentId}/packs`); // Use studentId
      if (!response.ok) throw new Error("Error fetching course packs");
      const data = await response.json();
      setPacks(data);
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les packs de cours",
      });
    }
  }, [studentId, toast]); // Update dependency

  // Fetch all students (needed for the dialog dropdown)
  const fetchAllStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students");
      if (!response.ok) throw new Error("Error fetching students");
      const data = await response.json();
      setAllStudents(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger la liste complète des élèves pour le formulaire.",
      });
    }
  }, [toast]);


  const fetchData = useCallback(async () => {
    if (!studentId) return; // Add guard clause
    // Fetch current student, their lessons, their packs, and all students for the dialog
    await Promise.all([fetchStudent(), fetchLessons(), fetchPacks(), fetchAllStudents()]);
  }, [fetchStudent, fetchLessons, fetchPacks, fetchAllStudents, studentId]); // Added fetchAllStudents and studentId dependency

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // New handler for when a lesson is added
  const handleLessonAdded = useCallback(async () => {
    // Refresh both lessons and packs, as adding a lesson (especially with a pack)
    // can affect both lists (e.g., pack's remaining lessons).
    await Promise.all([fetchLessons(), fetchPacks()]);
  }, [fetchLessons, fetchPacks]);

  const handleGenerateInvoice = () => {
    // Reset attestation data when opening invoice dialog
    setAttestationData(null);
    setShowInvoiceDialog(true);
  };

  const handleGenerateAttestation = () => {
    // Reset invoice data when opening attestation dialog
    setInvoiceData(null);
    setShowAttestationDialog(true);
  };

  const handleOpenEditStudentDialog = () => {
    if (student) {
      setEditStudentForm({
        name: student.name,
        rate: student.rate.toString(),
        phone: student.phone || "",
        address: student.address || "",
        courseDay: student.courseDay || "",
        courseHour: student.courseHour || "",
      });
    }
    setShowEditStudentDialog(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editStudentForm,
          rate: Number.parseInt(editStudentForm.rate),
        }),
      });

      if (!response.ok) throw new Error("Error updating student");

      await fetchStudent();
      setShowEditStudentDialog(false);
      toast({
        title: "Succès",
        description: "Informations de l'élève mises à jour",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour les informations de l'élève",
      });
    }
  };

  const handleInvoiceUpdate = (data: InvoiceData) => {
    setInvoiceData(data);
    // Also update attestation data if the attestation dialog is open
    if (showAttestationDialog) {
      setAttestationData(data);
    }
  };

  // Separate handler for attestation form updates if needed,
  // but reusing handleInvoiceUpdate might be sufficient if form logic is shared
  const handleAttestationUpdate = (data: InvoiceData) => {
     setAttestationData(data);
     // Also update invoice data if the invoice dialog is open
     if (showInvoiceDialog) {
       setInvoiceData(data);
     }
  };


  const downloadInvoice = async () => {
    if (!invoiceData) return;

    const html2pdf = (await import("html2pdf.js")).default; // Dynamic import

    const element = document.getElementById("invoice-preview");
    if (!element) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer le PDF",
      });
      return;
    }

    const opt = {
      margin: 1,
      filename: `facture-${invoiceData.invoiceNumber}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "cm", format: "a4", orientation: "portrait" },
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast({
        title: "Succès",
        description: "La facture a été téléchargée",
      });
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer le PDF",
      });
    }
  };

  const downloadAttestation = async () => {
    if (!attestationData) return;

    const html2pdf = (await import("html2pdf.js")).default; // Dynamic import

    const element = document.getElementById("attestation-preview"); // Target the new preview ID
    if (!element) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer le PDF de l'attestation",
      });
      return;
    }

    const opt = {
      margin: 1,
      filename: `attestation-${attestationData.clientName}-${attestationData.attestationYear}.pdf`, // Naming convention for attestation
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "cm", format: "a4", orientation: "portrait" },
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast({
        title: "Succès",
        description: "L'attestation a été téléchargée",
      });
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer le PDF de l'attestation",
      });
    }
  };


  const handleAddPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return; // Add guard clause

    try {
      const response = await fetch(`/api/students/${studentId}/packs`, { // Use studentId
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(packForm),
      });

      if (!response.ok) throw new Error("Error creating course pack");

      const data = await response.json();
      setPacks([data, ...packs]);
      setShowPackDialog(false);
      setPackForm({
        totalLessons: "10",
        price: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        expiryDate: "",
      });

      toast({
        title: "Succès",
        description: "Pack de cours ajouté avec succès",
      });
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le pack de cours",
      });
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!studentId) {
      toast({ variant: "destructive", title: "Erreur", description: "ID de l'élève manquant." });
      return;
    }
    if (!packId || typeof packId !== 'string') { // Add a check for packId
      toast({ variant: "destructive", title: "Erreur", description: "ID du pack invalide ou manquant." });
      console.error("handleDeletePack called with invalid packId:", packId);
      return;
    }
    try {
      const response = await fetch(`/api/students/${studentId}/packs/${packId}`, { // Use studentId
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error deleting pack");
      }

      const data = await response.json();
      await Promise.all([fetchLessons(), fetchPacks()]);

      toast({
        title: "Succès",
        description:
          data.unpaidLessons > 0
            ? `Pack supprimé et ${data.unpaidLessons} cours marqués comme non payés`
            : "Pack supprimé avec succès",
      });
    } catch (error: unknown) { // Changed 'any' to 'unknown'
      const message = error instanceof Error ? error.message : "Impossible de supprimer le pack"; // Added type check
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message, // Use checked message
      });
    } 
    // Removed finally block that reset packToDelete and showDeletePackDialog
  };

  const handleTogglePayment = async (lessonId: string, isPaid: boolean) => {
    if (!studentId) return; // Add guard clause
    try {
      const response = await fetch(`/api/students/${studentId}/update-payments`, { // Use studentId
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          isPaid,
        }),
      });

      if (!response.ok) throw new Error("Error updating payment status");

      // Refresh both lessons and packs, as changing payment status
      // of a pack-associated lesson affects remaining pack lessons.
      await Promise.all([fetchLessons(), fetchPacks()]);

      toast({
        title: "Succès",
        description: `Cours marqué comme ${isPaid ? "payé" : "non payé"}`,
      });
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de paiement",
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error deleting lesson");

      await Promise.all([fetchLessons(), fetchPacks()]);

      toast({
        title: "Succès",
        description: "Cours supprimé avec succès",
      });
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le cours",
      });
    }
  };

  const handleOpenPaymentDialog = () => {
    setSelectedLessons({});
    setSelectedPackForPayment("");
    setShowPaymentDialog(true);
  };

  const handlePayWithPack = async () => {
    if (!selectedPackForPayment) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner un pack",
      });
      return;
    }

    const selectedLessonIds = Object.entries(selectedLessons)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, isSelected]) => isSelected) // Added eslint disable for unused '_'
      .map(([id]) => id);

    if (selectedLessonIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner au moins un cours",
      });
      return;
    }
    if (!studentId) return; // Add guard clause

    try {
      const response = await fetch(`/api/students/${studentId}/update-payments`, { // Use studentId
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packId: selectedPackForPayment,
          lessonIds: selectedLessonIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error updating payments");
      }

      await Promise.all([fetchLessons(), fetchPacks()]);
      setShowPaymentDialog(false);

      toast({
        title: "Succès",
        description: `${selectedLessonIds.length} cours payés avec le pack`,
      });
    } catch (error: unknown) { // Changed 'any' to 'unknown'
      const message = error instanceof Error ? error.message : "Impossible de mettre à jour les paiements"; // Added type check
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message, // Use checked message
      });
    }
  };

  const handlePaySingleLessonWithPack = async () => {
    if (!selectedLesson || !selectedPackForPayment || !studentId) { // Add studentId check
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}/update-payments`, { // Use studentId
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packId: selectedPackForPayment,
          lessonIds: [selectedLesson],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error updating payment");
      }

      await Promise.all([fetchLessons(), fetchPacks()]);
      setShowPayWithPackDialog(false);
      setSelectedLesson(null);
      setSelectedPackForPayment("");

      toast({
        title: "Succès",
        description: "Cours payé avec le pack",
      });
    } catch (error: unknown) { // Changed 'any' to 'unknown'
      const message = error instanceof Error ? error.message : "Impossible de payer le cours avec le pack"; // Added type check
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message, // Use checked message
      });
    }
  };

  const confirmDeletePack = (packId: string) => {
    console.log("confirmDeletePack called with packId:", packId); // Log here
    // Directly call handleDeletePack without confirmation dialog
    handleDeletePack(packId);
  };

  const openPayWithPackDialog = (lessonId: string) => {
    setSelectedLesson(lessonId);
    setSelectedPackForPayment("");
    setShowPayWithPackDialog(true);
  };

  const toggleDeclared = async () => {
    if (!student || !studentId) return; // Add studentId check

    try {
      const response = await fetch(`/api/students/${studentId}`, { // Use studentId
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          declared: !student.declared,
        }),
      });

      if (!response.ok) throw new Error("Error updating student");

      setStudent({
        ...student,
        declared: !student.declared,
      });

      toast({
        title: "Succès",
        description: `Élève ${!student.declared ? "déclaré" : "non déclaré"}`,
      });
    } catch { // Removed unused 'error'
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de déclaration",
      });
    }
  };

  const paidLessons = lessons.filter((lesson) => lesson.isPaid);
  const totalPaid = paidLessons.reduce((sum: number, lesson: Lesson) => sum + lesson.amount, 0); // Added types
  const totalDue = lessons.reduce((sum: number, lesson: Lesson) => sum + lesson.amount, 0); // Added types
  const activePacks = packs.filter((pack) => pack.remainingLessons > 0);
  const totalRemainingLessons = activePacks.reduce((sum: number, pack: CoursePack) => sum + pack.remainingLessons, 0); // Added types
  const unpaidLessons = lessons.filter((lesson) => !lesson.isPaid);

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
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push("/students")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      {student && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{student.name}</h1>
            <div className="flex items-center gap-4">
              <div className="text-muted-foreground">
                Tarif: <span className="font-semibold">{student.rate}€</span>
              </div>
              <Button
                onClick={toggleDeclared}
                variant={student.declared ? "default" : "outline"}
              >
                {student.declared ? "Déclaré" : "Non déclaré"}
              </Button>
              {/* Add Lesson Button */}
              <Button onClick={() => setIsAddLessonDialogOpen(true)} variant="outline">
                 <Plus className="mr-2 h-4 w-4" />
                 Ajouter un cours
              </Button>
              <Button onClick={() => setShowPackDialog(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un pack
              </Button>
              {unpaidLessons.length > 0 && activePacks.length > 0 && (
                <Button onClick={handleOpenPaymentDialog} variant="outline">
                  <Check className="mr-2 h-4 w-4" />
                  Payer des cours avec un pack
                </Button>
              )}
              <Button onClick={handleGenerateInvoice}>
                <FileDown className="mr-2 h-4 w-4" />
                Générer une facture
              </Button>
              {/* Add Attestation Button */}
              <Button onClick={handleGenerateAttestation} variant="secondary">
                <FileDown className="mr-2 h-4 w-4" />
                Générer une attestation
              </Button>
              <Button onClick={handleOpenEditStudentDialog} variant="outline">
                Modifier
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p><strong>Téléphone:</strong> {student.phone || "-"}</p>
                <p><strong>Adresse:</strong> {student.address || "-"}</p>
                <p><strong>Jour de cours:</strong> {student.courseDay || "-"}</p>
                <p><strong>Heure de cours:</strong> {student.courseHour || "-"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Nombre de cours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{lessons.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total dû</CardTitle> {/* Fixed unescaped entity */}
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalDue - totalPaid}€</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total payé</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalPaid}€</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cours restants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalRemainingLessons}</p>
              </CardContent>
            </Card>
          </div>

          {packs.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">Packs de cours</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date d&apos;achat</TableHead>
                      <TableHead>Total cours</TableHead>
                      <TableHead>Cours restants</TableHead>
                      <TableHead>Date d&apos;expiration</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packs.map((pack) => (
                      <TableRow key={pack._id}>
                        <TableCell>
                          {new Date(pack.purchaseDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{pack.totalLessons}</TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {pack.remainingLessons}
                          </span>
                        </TableCell>
                        <TableCell>
                          {pack.expiryDate
                            ? new Date(pack.expiryDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {pack.price}€
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeletePack(pack._id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold mb-4">Historique des cours</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((lesson) => (
                  <TableRow key={lesson._id}>
                    <TableCell>
                      {new Date(lesson.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{lesson.comment || "-"}</TableCell>
                    <TableCell>
                      {lesson.isPaid ? (
                        lesson.packId ? (
                          <span className="text-blue-600 font-medium">
                            Pack
                          </span>
                        ) : (
                          <span className="text-green-600 font-medium">
                            Payé
                          </span>
                        )
                      ) : (
                        <span className="text-red-600 font-medium">
                          Non payé
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {lesson.amount}€
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {!lesson.isPaid && activePacks.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPayWithPackDialog(lesson._id)}
                          >
                            <CreditCard className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        {lesson.isPaid ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleTogglePayment(lesson._id, false)
                            }
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleTogglePayment(lesson._id, true)
                            }
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteLesson(lesson._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Générer une facture</DialogTitle>
              </DialogHeader>
              <div className="flex gap-4 overflow-auto">
                <div className="flex-1 min-w-[300px] overflow-y-auto">
                  <InvoiceForm
                    onUpdate={handleInvoiceUpdate}
                    initialData={{
                      // Removed rate from here
                      clientName: student.name,
                    }}
                    studentId={studentId} // Use studentId
                    studentRate={student.rate} // Pass rate as separate prop
                  />
                </div>
                {invoiceData && (
                  <div className="flex-1 min-w-[300px] overflow-y-auto">
                    <div className="sticky top-0 bg-white z-10 pb-2">
                      <div className="flex justify-end mb-2">
                        <Button onClick={downloadInvoice}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Télécharger en PDF
                        </Button>
                      </div>
                    </div>
                    <div id="invoice-preview" className="overflow-y-auto">
                      <InvoicePreview data={invoiceData} />
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showPackDialog} onOpenChange={setShowPackDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un pack de cours</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPack} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="totalLessons">Nombre de cours</Label>
                  <Input
                    id="totalLessons"
                    type="number"
                    value={packForm.totalLessons}
                    onChange={(e) =>
                      setPackForm({ ...packForm, totalLessons: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Prix total du pack (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={packForm.price}
                    onChange={(e) =>
                      setPackForm({ ...packForm, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Date d&apos;achat</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={packForm.purchaseDate}
                    onChange={(e) =>
                      setPackForm({ ...packForm, purchaseDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">
                    Date d&apos;expiration (optionnel)
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={packForm.expiryDate}
                    onChange={(e) =>
                      setPackForm({ ...packForm, expiryDate: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPackDialog(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">Ajouter</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showPayWithPackDialog}
            onOpenChange={setShowPayWithPackDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Payer avec un pack</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Sélectionner un pack</Label>
                  <Select
                    value={selectedPackForPayment}
                    onValueChange={setSelectedPackForPayment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePacks.map((pack) => (
                        <SelectItem key={pack._id} value={pack._id}>
                          Pack de {pack.totalLessons} cours -{" "}
                          {pack.remainingLessons} restants
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cours à payer</Label>
                  {selectedLesson &&
                    lessons.find((l) => l._id === selectedLesson) && (
                      <div className="border rounded-md p-2">
                        <div className="flex justify-between">
                          <span>
                            {new Date(
                              lessons.find((l) => l._id === selectedLesson)
                                ?.date || ""
                            ).toLocaleDateString()}
                          </span>
                          <span className="font-semibold">
                            {
                              lessons.find((l) => l._id === selectedLesson)
                                ?.amount
                            }
                            €
                          </span>
                        </div>
                        {lessons.find((l) => l._id === selectedLesson)
                          ?.comment && (
                          <span className="text-sm text-muted-foreground">
                            {
                              lessons.find((l) => l._id === selectedLesson)
                                ?.comment
                            }
                          </span>
                        )}
                      </div>
                    )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedLesson(null);
                      setShowPayWithPackDialog(false);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handlePaySingleLessonWithPack}
                    disabled={!selectedPackForPayment || !selectedLesson}
                  >
                    Payer avec le pack
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* Removed Delete Pack Confirmation Dialog */}

          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Payer avec un pack</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Sélectionner un pack</Label>
                  <Select
                    value={selectedPackForPayment}
                    onValueChange={setSelectedPackForPayment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePacks.map((pack) => (
                        <SelectItem key={pack._id} value={pack._id}>
                          Pack de {pack.totalLessons} cours -{" "}
                          {pack.remainingLessons} restants
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sélectionner les cours à payer</Label>
                  <div className="max-h-[300px] overflow-y-auto border rounded-md p-2">
                    {unpaidLessons.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Aucun cours non payé
                      </p>
                    ) : (
                      unpaidLessons.map((lesson) => (
                        <div
                          key={lesson._id}
                          className="flex items-center space-x-2 py-2 border-b last:border-0"
                        >
                          <Checkbox
                            id={`lesson-${lesson._id}`}
                            checked={!!selectedLessons[lesson._id]}
                            onCheckedChange={(checked) => {
                              setSelectedLessons({
                                ...selectedLessons,
                                [lesson._id]: !!checked,
                              });
                            }}
                          />
                          <Label
                            htmlFor={`lesson-${lesson._id}`}
                            className="flex-1"
                          >
                            <div className="flex justify-between">
                              <span>
                                {new Date(lesson.date).toLocaleDateString()}
                              </span>
                              <span className="font-semibold">
                                {lesson.amount}€
                              </span>
                            </div>
                            {lesson.comment && (
                              <span className="text-sm text-muted-foreground">
                                {lesson.comment}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPaymentDialog(false)}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handlePayWithPack}>
                    Payer avec le pack
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      <Toaster />

      {/* Attestation Dialog */}
      <Dialog open={showAttestationDialog} onOpenChange={setShowAttestationDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Générer une Attestation Fiscale Annuelle</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 overflow-auto">
            <div className="flex-1 min-w-[300px] overflow-y-auto">
              {/* Use InvoiceForm, but pass handleAttestationUpdate */}
              <InvoiceForm
                onUpdate={handleAttestationUpdate}
                initialData={{
                  clientName: student?.name, // Use optional chaining
                  // clientAddress: student?.address, // Removed: Student type doesn't have address
                  // Set initial year if desired, or let the form handle it
                  // attestationYear: new Date().getFullYear().toString(),
                }}
                studentId={studentId} // Use studentId
                studentRate={student?.rate} // Pass rate as separate prop
              />
            </div>
            {attestationData && (
              <div className="flex-1 min-w-[300px] overflow-y-auto">
                <div className="sticky top-0 bg-white z-10 pb-2">
                  <div className="flex justify-end mb-2">
                    <Button onClick={downloadAttestation}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Télécharger Attestation PDF
                    </Button>
                  </div>
                </div>
                {/* Target this div for PDF generation */}
                <div id="attestation-preview" className="overflow-y-auto">
                  <AttestationPreview data={attestationData} />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <AddLessonDialog
        students={allStudents} // Pass the full list
        isOpen={isAddLessonDialogOpen}
        onClose={() => setIsAddLessonDialogOpen(false)}
        onLessonAdded={handleLessonAdded} // Use the new handler to refresh both lessons and packs
        preselectedStudentId={studentId} // Pass the current student's ID
      />

      <Dialog open={showEditStudentDialog} onOpenChange={setShowEditStudentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier les informations de l&apos;élève</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStudent} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nom</Label>
              <Input
                id="edit-name"
                value={editStudentForm.name}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-rate">Tarif</Label>
              <Input
                id="edit-rate"
                type="number"
                value={editStudentForm.rate}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, rate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Téléphone</Label>
              <Input
                id="edit-phone"
                value={editStudentForm.phone}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Adresse</Label>
              <Input
                id="edit-address"
                value={editStudentForm.address}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-courseDay">Jour du cours</Label>
              <Select
                value={editStudentForm.courseDay}
                onValueChange={(value) => setEditStudentForm({ ...editStudentForm, courseDay: value })}
              >
                <SelectTrigger id="edit-courseDay">
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
            <div>
              <Label htmlFor="edit-courseHour">Heure du cours</Label>
              <Select
                value={editStudentForm.courseHour}
                onValueChange={(value) => setEditStudentForm({ ...editStudentForm, courseHour: value })}
              >
                <SelectTrigger id="edit-courseHour">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditStudentDialog(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
