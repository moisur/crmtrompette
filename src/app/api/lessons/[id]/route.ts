import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

interface DeleteLessonContext {
  params: Promise<{ // Type params as a Promise
    id: string;
  }>;
}

export async function DELETE(req: Request, context: DeleteLessonContext) {
  try {
    const { id } = await context.params; // Await context.params
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    // Get the lesson to check if it's associated with a pack
    const lesson = await db.collection("lessons").findOne({
      _id: new ObjectId(id),
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Delete the lesson
    const result = await db.collection("lessons").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // If the lesson was paid with a pack, update the pack's remaining lessons
    if (lesson.packId) {
      // Count how many lessons are actually using this pack
      const usedLessonsCount = await db.collection("lessons").countDocuments({
        packId: new ObjectId(lesson.packId),
      });

      // Get the pack to know its total lessons
      const pack = await db.collection("coursePacks").findOne({
        _id: new ObjectId(lesson.packId),
      });

      if (pack) {
        // Update the pack with the correct number of remaining lessons
        await db
          .collection("coursePacks")
          .updateOne(
            { _id: new ObjectId(lesson.packId) },
            { $set: { remainingLessons: pack.totalLessons - usedLessonsCount } },
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error deleting lesson" }, { status: 500 });
  }
}
