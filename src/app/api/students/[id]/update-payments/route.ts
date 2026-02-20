import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

interface UpdatePaymentsContext {
  params: Promise<{ // Type params as a Promise
    id: string;
  }>;
}

// Cette API permet de mettre à jour le statut de paiement des cours d'un élève
// et d'utiliser un pack pour payer des cours non payés
export async function POST(
  req: Request,
  context: UpdatePaymentsContext
) {
  try {
    const { id } = await context.params; // Await context.params
    const client = await clientPromise;
    const db = client.db("trumpeeett");
    const body = await req.json();

    // Si on utilise un pack pour payer des cours non payés
    if (body.packId && body.lessonIds && body.lessonIds.length > 0) {
      const pack = await db.collection("coursePacks").findOne({
        _id: new ObjectId(body.packId)
      });

      if (!pack) {
        return NextResponse.json({ error: "Pack not found" }, { status: 404 });
      }

      // Vérifier si le pack a suffisamment de cours restants
      if (pack.remainingLessons < body.lessonIds.length) {
        return NextResponse.json(
          { error: "Not enough lessons remaining in the pack" },
          { status: 400 }
        );
      }

      // Mettre à jour les cours pour les marquer comme payés avec le pack
      await db.collection("lessons").updateMany(
        {
          _id: { $in: body.lessonIds.map((id: string) => new ObjectId(id)) },
          studentId: new ObjectId(id)
        },
        {
          $set: {
            isPaid: true,
            packId: new ObjectId(body.packId)
          }
        }
      );

      // Mettre à jour le nombre de cours restants dans le pack
      await db
        .collection("coursePacks")
        .updateOne(
          { _id: new ObjectId(body.packId) },
          { $inc: { remainingLessons: -body.lessonIds.length } }
        );

      return NextResponse.json({
        success: true,
        updatedLessons: body.lessonIds.length,
        remainingLessons: pack.remainingLessons - body.lessonIds.length
      });
    }

    // Si on met à jour le statut de paiement d'un cours individuel
    if (body.lessonId && body.isPaid !== undefined) {
      const lessonObjectId = new ObjectId(body.lessonId);

      // Si on marque comme non payé, vérifier s'il faut réincrémenter un pack
      if (body.isPaid === false) {
        const lesson = await db.collection("lessons").findOne({ _id: lessonObjectId });
        // Si le cours était payé par un pack, réincrémenter le pack
        if (lesson && lesson.packId) {
          await db.collection("coursePacks").updateOne(
            { _id: lesson.packId }, // packId est déjà un ObjectId
            { $inc: { remainingLessons: 1 } }
          );
        }
      }

      // Mettre à jour le cours
      await db.collection("lessons").updateOne(
        { _id: lessonObjectId },
        {
          $set: {
            isPaid: body.isPaid,
            // Si on marque comme non payé, on retire l'association avec un pack
            ...(body.isPaid === false ? { packId: null } : {})
          }
        }
      );

      return NextResponse.json({
        success: true,
        lessonId: body.lessonId,
        isPaid: body.isPaid
      });
    }

    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating payments:", error);
    return NextResponse.json(
      { error: "Error updating payments" },
      { status: 500 }
    );
  }
}
