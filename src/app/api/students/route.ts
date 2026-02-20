import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("trumpeeett");
    const body = await req.json();

    const result = await db.collection("students").insertOne({
      name: body.name,
      rate: Number.parseInt(body.rate),
      declared: false,
      archived: false, // Add archived field
      createdAt: new Date(),
      phone: body.phone,
      address: body.address,
      courseDay: body.courseDay,
      courseHour: body.courseHour,
    });

    return NextResponse.json({
      id: result.insertedId,
      name: body.name,
      rate: Number.parseInt(body.rate),
      declared: false,
      archived: false, // Include in response
      phone: body.phone,
      address: body.address,
      courseDay: body.courseDay,
      courseHour: body.courseHour,
    });
  } catch {
    return NextResponse.json({ error: "Error creating student" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    const students = await db.collection("students").find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(students);
  } catch {
    return NextResponse.json({ error: "Error fetching students" }, { status: 500 });
  }
}
