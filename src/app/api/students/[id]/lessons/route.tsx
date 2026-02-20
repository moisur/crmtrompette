import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

interface GetStudentLessonsContext {
  params: Promise<{ // Type params as a Promise
    id: string;
  }>;
}

export async function GET(req: Request, context: GetStudentLessonsContext) {
  try {
    const { id } = await context.params; // Await context.params
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    const lessons = await db
      .collection("lessons")
      .find({
        studentId: new ObjectId(id),
      })
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json(lessons);
  } catch {
    return NextResponse.json({ error: "Error fetching lessons" }, { status: 500 });
  }
}
