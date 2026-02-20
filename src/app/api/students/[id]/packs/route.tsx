import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

interface StudentPacksContext {
  params: Promise<{ // Type params as a Promise
    id: string;
  }>;
}

export async function GET(request: Request, context: StudentPacksContext) {
  try {
    const { id } = await context.params; // Await context.params
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    // Get all packs for the student
    const packs = await db
      .collection("coursePacks")
      .find({
        studentId: new ObjectId(id),
      })
      .sort({ createdAt: -1 })
      .toArray();

    // For each pack, count the actual number of lessons used
    const packsWithCorrectCount = await Promise.all(
      packs.map(async (pack) => {
        const usedLessonsCount = await db.collection("lessons").countDocuments({
          packId: new ObjectId(pack._id),
        });

        // Update the pack in the database with the correct remaining lessons
        await db
          .collection("coursePacks")
          .updateOne(
            { _id: new ObjectId(pack._id) },
            { $set: { remainingLessons: pack.totalLessons - usedLessonsCount } },
          );

        return {
          ...pack,
          remainingLessons: pack.totalLessons - usedLessonsCount,
        };
      }),
    );

    return NextResponse.json(packsWithCorrectCount);
  } catch {
    return NextResponse.json({ error: "Error fetching course packs" }, { status: 500 });
  }
}

export async function POST(request: Request, context: StudentPacksContext) {
  try {
    const { id } = await context.params; // Await context.params
    const client = await clientPromise;
    const db = client.db("trumpeeett");
    const body = await request.json();

    const result = await db.collection("coursePacks").insertOne({
      studentId: new ObjectId(id),
      totalLessons: Number(body.totalLessons),
      remainingLessons: Number(body.totalLessons),
      purchaseDate: new Date(body.purchaseDate),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      price: Number(body.price),
      createdAt: new Date(),
    });

    // Return the full document that was inserted, which includes _id
    const newPack = await db.collection("coursePacks").findOne({ _id: result.insertedId });

    return NextResponse.json(newPack);
  } catch (error) { // Define error here
    console.error("Error creating course pack:", error); // Log the actual error
    return NextResponse.json({ error: "Error creating course pack" }, { status: 500 });
  }
}
