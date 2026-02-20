import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

interface StudentRouteContext {
  params: Promise<{ // Type params as a Promise
    id: string;
  }>;
}

export async function GET(req: Request, context: StudentRouteContext) {
  try {
    const { id } = await context.params; // Await context.params
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    const student = await db.collection("students").findOne({
      _id: new ObjectId(id),
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: "Error fetching student" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: StudentRouteContext) {
  try {
    const { id } = await context.params; // Await context.params
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    const result = await db
      .collection("students")
      .updateOne({ _id: new ObjectId(id) }, { $set: body });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error updating student" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: StudentRouteContext) {
  try {
    const { id } = await context.params; // Await context.params
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    // Delete associated lessons first
    await db.collection("lessons").deleteMany({
      studentId: new ObjectId(id),
    });

    // Then delete the student
    const result = await db.collection("students").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error deleting student" }, { status: 500 });
  }
}
