import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

interface DeletePackContext {
  params: Promise<{ // Type params as a Promise
    id: string;
    packId: string;
  }>;
}

export async function DELETE(req: Request, context: DeletePackContext) {
  const { id, packId } = await context.params; // Await context.params

  if (!packId || typeof packId !== 'string' || packId.length !== 24) {
    console.error("Invalid packId received:", packId);
    return NextResponse.json({ error: "Invalid pack ID format" }, { status: 400 });
  }
  if (!id || typeof id !== 'string' || id.length !== 24) {
    console.error("Invalid student id received:", id);
    return NextResponse.json({ error: "Invalid student ID format" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    // Get the pack to check if it exists
    const pack = await db.collection("coursePacks").findOne({
      _id: new ObjectId(packId),
      studentId: new ObjectId(id),
    });

    if (!pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    // Get all lessons using this pack
    const lessons = await db
      .collection("lessons")
      .find({ packId: new ObjectId(packId) })
      .toArray();

    // Mark all lessons as unpaid
    if (lessons.length > 0) {
      await db
        .collection("lessons")
        .updateMany({ packId: new ObjectId(packId) }, { $set: { isPaid: false, packId: null } });
    }

    // Delete the pack
    const result = await db.collection("coursePacks").deleteOne({ _id: new ObjectId(packId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      unpaidLessons: lessons.length,
    });
  } catch (error) {
    console.error("Error deleting pack:", error);
    return NextResponse.json({ error: "Error deleting pack" }, { status: 500 });
  }
}
