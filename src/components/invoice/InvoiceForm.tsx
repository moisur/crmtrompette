import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Added for better form structure
import { InvoiceData, Service } from "@/lib/types";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import ServiceLine from "./ServiceLine";

interface InvoiceFormProps {
  onUpdate: (data: InvoiceData) => void;
  initialData?: Partial<InvoiceData>;
  studentId?: string;
  studentRate?: number; // Add studentRate prop
}

// Removed unused generateInvoiceNumber function

const InvoiceForm = ({
  onUpdate,
  initialData = {},
  studentId,
  studentRate // Destructure the new prop
}: InvoiceFormProps) => {
  const [formData, setFormData] = useState<InvoiceData>({
    companyName: "YERVANT Jean-Christophe",
    companyAddress: "9 rue de la Fontaine au Roi 75011 PARIS",
    siret: "75292984400039",
    agreementNumber: "752929844",
    clientName: initialData.clientName || "",
    clientAddress: initialData.clientAddress || "",
    invoiceNumber: `F${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}-`,
    invoiceDate: new Date().toISOString().split("T")[0],
    attestationYear: new Date().getFullYear().toString(), // Add year for attestation
    totalAmountPaid: 0, // Add total amount paid
    services: [],
    paymentMethod: "Virement bancaire",
    showAgreementInfo: true,
  });

  useEffect(() => {
    const fetchLessons = async () => {
      if (!studentId) return;

      try {
        const response = await fetch(`/api/students/${studentId}/lessons`);
        // Define a basic type for the fetched lesson data
        type FetchedLesson = {
          _id: string;
          date: string;
          comment?: string;
          amount: number;
        };
        const lessons: FetchedLesson[] = await response.json();

        const services = lessons.map((lesson) => ({
          id: lesson._id,
          date: new Date(lesson.date).toISOString().split("T")[0],
          description: lesson.comment || "Cours de musique à domicile",
          numberOfLessons: 1,
          rate: lesson.amount
        }));

        const newData = { ...formData, services };
        setFormData(newData);
        onUpdate(newData);
      } catch (error) {
        console.error("Erreur lors de la récupération des cours:", error);
      }
    };

    fetchLessons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]); // Added dependency array comment to satisfy potential lint rule if onUpdate/formData were needed

  const handleChange = (
    field: keyof InvoiceData,
    value: string | number | boolean
  ) => {
    // Allow number type for value
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onUpdate(newData);
  };

  const addService = () => {
    const newService: Service = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      description: "Cours de musique à domicile",
      numberOfLessons: 1,
      rate: studentRate || 60 // Use studentRate prop here
    };
    const newData = {
      ...formData,
      services: [...formData.services, newService]
    };
    setFormData(newData);
    onUpdate(newData);
  };

  const updateService = (
    id: string,
    field: keyof Service,
    value: string | number
  ) => {
    const newServices = formData.services.map((service) =>
      service.id === id ? { ...service, [field]: value } : service
    );
    const newData = { ...formData, services: newServices };
    setFormData(newData);
    onUpdate(newData);
  };

  const deleteService = (id: string) => {
    const newServices = formData.services.filter(
      (service) => service.id !== id
    );
    const newData = { ...formData, services: newServices };
    setFormData(newData);
    onUpdate(newData);
  };

  // Calculate total amount paid based on services for the selected year
  useEffect(() => {
    const year = formData.attestationYear;
    if (!year || !formData.services) {
      handleChange("totalAmountPaid", 0); // Reset if no year or services
      return;
    }

    const totalForYear = formData.services
      .filter(service => service.date.startsWith(year)) // Filter services by year
      .reduce((sum, service) => sum + (service.numberOfLessons * service.rate), 0);

    handleChange("totalAmountPaid", totalForYear); // Update the total amount state

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.services, formData.attestationYear]); // Recalculate when services or year change


  return (
    <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
      <h1 className="text-2xl font-bold text-center mb-6">
        Édition de la facture/attestation
      </h1>

      {/* Display Company Info Statically */}
      <div className="space-y-1 border p-4 rounded-md bg-gray-50 text-sm">
        <h2 className="text-lg font-semibold mb-2">
          Informations sur l&apos;entreprise
        </h2>
        <p>
          <strong>Dénomination sociale:</strong> {formData.companyName}
        </p>
        <p>
          <strong>Adresse:</strong> {formData.companyAddress}
        </p>
        <p>
          <strong>N°SIRET:</strong> {formData.siret}
        </p>
        {/* <p><strong>N° Agrément SAP:</strong> {formData.agreementNumber}</p> */}{" "}
        {/* Agreement number wasn't in the user's static text */}
        <p>
          <strong>Date Déclaration:</strong> 30/12/2024
        </p>{" "}
        {/* Hardcoded as requested, consider making dynamic */}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">
          Informations sur le client
        </h2>
        <Input
          placeholder="Nom du client"
          value={formData.clientName}
          onChange={(e) => handleChange("clientName", e.target.value)}
        />
        <Input
          placeholder="Adresse du client"
          value={formData.clientAddress}
          onChange={(e) => handleChange("clientAddress", e.target.value)}
        />
        {/* Add fields for Postal Code and City if needed */}
        {/* <Input placeholder="Code Postal" ... /> */}
        {/* <Input placeholder="Ville" ... /> */}
      </div>

      {/* Attestation Details */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">
          Détails de la facture/attestation
        </h2>{" "}
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Numéro de facture"
            value={formData.invoiceNumber}
            onChange={(e) => handleChange("invoiceNumber", e.target.value)}
          />
          <Input
            type="date"
            placeholder="Date de la facture"
            value={formData.invoiceDate}
            onChange={(e) => handleChange("invoiceDate", e.target.value)}
          />
        </div>
        {/* Escaped apostrophe */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="attestationYear">Année de l&apos;attestation</Label>{" "}
            {/* Escaped apostrophe */}
            <Input
              id="attestationYear"
              type="number"
              placeholder="Année"
              value={formData.attestationYear}
              onChange={(e) => handleChange("attestationYear", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="totalAmountPaid">Montant total acquitté (€)</Label>{" "}
            {/* Escaped apostrophe - although not strictly needed here, kept for consistency if label changes */}
            <Input
              id="totalAmountPaid"
              type="number"
              placeholder="Montant Total"
              value={formData.totalAmountPaid || 0} // Display 0 if undefined/null
              readOnly // Make the field read-only
              className="bg-gray-100" // Style to indicate read-only
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showAgreementInfo"
            checked={formData.showAgreementInfo}
            onCheckedChange={(checked) =>
              handleChange("showAgreementInfo", !!checked)
            }
          />
          <Label htmlFor="showAgreementInfo">
            Afficher les informations d&apos;agrément sur le PDF
          </Label>
        </div>
      </div>

      {/* Certification Text Preview */}
      <div className="space-y-2 mt-4 p-4 border rounded-md bg-gray-50 text-sm">
        <p>
          Je soussigné, {formData.companyName}, certifie que{" "}
          {formData.clientName || "[Prénom Nom du bénéficiaire]"}, a bénéficié
          de services à la personne : cours de trompette à domicile.
        </p>
        <p>
          En {formData.attestationYear || "[Année]"}, le montant des factures
          effectivement acquittées représente une somme totale de :{" "}
          {formData.totalAmountPaid || "[Montant]"} €.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Prestations</h2>
          <Button
            onClick={addService}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Ajouter une prestation
          </Button>
        </div>
        <div className="space-y-2">
          {formData.services.map((service) => (
            <ServiceLine
              key={service.id}
              service={service}
              onChange={updateService}
              onDelete={deleteService}
            />
          ))}
        </div>
      </div>

      {/* Remove Payment Section */}
      {/*
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Paiement</h2>
        <Input
          placeholder="Mode de paiement"
          value={formData.paymentMethod}
          onChange={(e) => handleChange("paymentMethod", e.target.value)}
        />
      </div>
      */}
    </div>
  );
};

export default InvoiceForm;
