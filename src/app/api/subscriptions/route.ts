import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.user.id },
    orderBy: { renewalDate: "asc" },
  });

  return NextResponse.json(subscriptions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, amount, currency, startDate, renewalDate, durationMonths, category, planMeta } = body;

  if (!name || amount == null || !startDate || !renewalDate || !durationMonths || !category) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId: session.user.id,
      name: String(name),
      amount: parseFloat(amount),
      currency: currency ?? "EUR",
      startDate: new Date(startDate),
      renewalDate: new Date(renewalDate),
      durationMonths: parseInt(durationMonths),
      category,
      planMeta: planMeta ?? undefined,
    },
  });

  return NextResponse.json(subscription, { status: 201 });
}
