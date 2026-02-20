"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { CoursePack, PaymentStatus, Student } from "@/lib/types"; // Assuming types are correctly defined

interface AddLessonDialogProps {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
  onLessonAdded: () => void; // Callback to refresh lessons list
  preselectedStudentId?: string; // New optional prop
}

export function AddLessonDialog({
  students,
  isOpen,
  onClose,
  onLessonAdded,
  preselectedStudentId, // Destructure new prop
}: AddLessonDialogProps) {
  const [loading, setLoading] = useState(false);
  const [packs, setPacks] = useState<{ [key: string]: CoursePack[] }>({});
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [lessonType, setLessonType] = useState<"full" | "half">("full");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    isPaid: true,
  });
  const [comment, setComment] = useState("");
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split("T")[0]);
  const { toast } = useToast();

  const fetchStudentPacks = useCallback(
    async (studentId: string) => {
      if (!studentId) {
        setPacks((prev) => ({ ...prev, [studentId]: [] })); // Clear packs if no student selected
        return;
      }
      try {
        const response = await fetch(`/api/students/${studentId}/packs`);
        if (!response.ok) throw new Error("Error fetching packs");
        const data = await response.json();
        setPacks((prev) => ({
          ...prev,
          [studentId]: data.filter((pack: CoursePack) => pack.remainingLessons > 0),
        }));
      } catch {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les packs de cours pour cet élève",
        });
        setPacks((prev) => ({ ...prev, [studentId]: [] })); // Clear packs on error
      }
    },
    [toast],
  );

  // Fetch packs when selected student changes
  useEffect(() => {
    fetchStudentPacks(selectedStudent);
  }, [selectedStudent, fetchStudentPacks]);

  // Reset form when dialog opens or student changes
  useEffect(() => {
    if (isOpen) {
      if (preselectedStudentId) {
        setSelectedStudent(preselectedStudentId);
      } else {
        // If no preselection, or if you want to clear it when dialog reopens without preselection:
        // setSelectedStudent(""); // Uncomment if you want to clear selection if no preselectedStudentId
      }
      setLessonType("full");
      setPaymentStatus({ isPaid: true }); // Reset payment status
      setComment("");
      setLessonDate(new Date().toISOString().split("T")[0]);
      // Packs will be fetched by the other useEffect based on selectedStudent
    }
  }, [isOpen, preselectedStudentId]); // Add preselectedStudentId to dependency array


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
        toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un élève." });
        return;
    };

    setLoading(true);
    const student = students.find((s) => s._id === selectedStudent);

    // Calculate amount based on lesson type
    const fullRate = student?.rate || 0;
    const amount = lessonType === "full" ? fullRate : fullRate / 2;

    // Ensure packId is only sent if 'Use Pack' is selected and a pack is chosen
    const finalPackId = (hasActivePacks && paymentStatus.packId && paymentStatus.isPaid) ? paymentStatus.packId : undefined;

    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudent,
          date: new Date(lessonDate).toISOString(),
          amount: amount,
          comment: comment.trim() || undefined,
          isPaid: paymentStatus.isPaid,
          packId: finalPackId, // Use the potentially undefined packId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to get error details
        throw new Error(errorData.error || "Error creating lesson");
      }

      onLessonAdded(); // Call the callback to refresh parent's lesson list
      // No need to fetch packs here, parent component handles lesson list update
      onClose(); // Close the dialog
      toast({
        title: "Succès",
        description: "Cours ajouté avec succès",
      });
      // State reset is handled by the useEffect hook listening to `isOpen`
    } catch (error: unknown) {
       const message = error instanceof Error ? error.message : "Impossible d'ajouter le cours";
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedStudentData = students.find((s) => s._id === selectedStudent);
  const studentPacks = selectedStudent ? packs[selectedStudent] || [] : [];
  const hasActivePacks = studentPacks.length > 0;

  // Determine the current value for the payment RadioGroup
  const paymentRadioValue = () => {
    if (hasActivePacks && paymentStatus.packId && paymentStatus.isPaid) return "pack";
    if (paymentStatus.isPaid) return "paid";
    return "unpaid";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau cours</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="student">Élève</Label>
            <Select
              value={selectedStudent}
              onValueChange={(value) => {
                setSelectedStudent(value);
                // Reset payment status if student changes, especially if switching from one with packs to one without
                setPaymentStatus({ isPaid: true });
              }}
            >
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

          <div className="space-y-2">
            <Label htmlFor="lessonDate">Date du cours</Label>
            <Input
              id="lessonDate"
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              required
            />
          </div>

          {selectedStudentData && (
            <div className="space-y-2">
              <Label>Type de cours</Label>
              <RadioGroup
                value={lessonType}
                onValueChange={(value) => setLessonType(value as "full" | "half")}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="dialog-full" /> {/* Ensure unique ID */}
                  <Label htmlFor="dialog-full">Cours complet ({selectedStudentData.rate}€)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="half" id="dialog-half" /> {/* Ensure unique ID */}
                  <Label htmlFor="dialog-half">Demi-cours ({selectedStudentData.rate / 2}€)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {selectedStudent && ( // Only show payment options if a student is selected
            <div className="space-y-2">
              <Label>Paiement</Label>
              <RadioGroup
                value={paymentRadioValue()}
                onValueChange={(value) => {
                  if (value === "pack" && hasActivePacks) {
                    // Default to the first available pack when 'Use Pack' is selected
                    setPaymentStatus({
                      isPaid: true, // Paying with pack means it's considered paid
                      packId: studentPacks[0]._id, // Default to first pack
                    });
                  } else {
                    setPaymentStatus({
                      isPaid: value === "paid", // Set isPaid based on selection
                      packId: undefined, // Clear packId if not using a pack
                    });
                  }
                }}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paid" id="dialog-paid" /> {/* Ensure unique ID */}
                  <Label htmlFor="dialog-paid">Payé</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unpaid" id="dialog-unpaid" /> {/* Ensure unique ID */}
                  <Label htmlFor="dialog-unpaid">Non payé</Label>
                </div>
                {hasActivePacks && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pack" id="dialog-pack" /> {/* Ensure unique ID */}
                    <Label htmlFor="dialog-pack">Utiliser un pack</Label>
                  </div>
                )}
              </RadioGroup>

              {/* Show pack selection only if 'Use Pack' is selected */}
              {hasActivePacks && paymentStatus.packId && paymentStatus.isPaid && (
                <div className="mt-2">
                  <Label htmlFor="packSelect">Sélectionner un pack</Label>
                  <Select
                    value={paymentStatus.packId} // Should always have a value here if visible
                    onValueChange={(value) => setPaymentStatus({ isPaid: true, packId: value })}
                  >
                    <SelectTrigger id="packSelect">
                      <SelectValue placeholder="Sélectionner un pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentPacks.map((pack) => (
                        <SelectItem key={pack._id} value={pack._id}>
                          Pack de {pack.totalLessons} cours - {pack.remainingLessons} restants
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              placeholder="Ajouter un commentaire..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !selectedStudent}>
              {loading ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
