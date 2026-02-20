import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("trumpeeett");
    const body = await req.json();

    const lessonData = {
      studentId: new ObjectId(body.studentId),
      date: new Date(body.date),
      amount: Number.parseInt(body.amount),
      comment: body.comment,
      isPaid: body.isPaid,
      packId: body.packId ? new ObjectId(body.packId) : null,
      createdAt: new Date()
    };

    // If using a course pack, update the remaining lessons
    if (body.packId) {
      await db
        .collection("coursePacks")
        .updateOne(
          { _id: new ObjectId(body.packId) },
          { $inc: { remainingLessons: -1 } }
        );
    }

    const result = await db.collection("lessons").insertOne(lessonData);

    return NextResponse.json({
      id: result.insertedId,
      studentId: body.studentId,
      date: body.date,
      amount: Number.parseInt(body.amount),
      comment: body.comment,
      isPaid: body.isPaid,
      packId: body.packId
    });
  } catch {
    return NextResponse.json(
      { error: "Error creating lesson" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("trumpeeett");

    const lessons = await db
      .collection("lessons")
      .aggregate([
        {
          $lookup: {
            from: "students",
            localField: "studentId",
            foreignField: "_id",
            as: "student"
          }
        },
        {
          $unwind: "$student"
        },
        {
          $sort: { date: -1 }
        }
      ])
      .toArray();

    return NextResponse.json(lessons);
  } catch {
    return NextResponse.json(
      { error: "Error fetching lessons" },
      { status: 500 }
    );
  }
}
