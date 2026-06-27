export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";

async function ownershipCheck(id: string, userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return { error: "Introuvable", status: 404 };
  if (sub.userId !== userId) return { error: "Interdit", status: 403 };
  return { sub };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await ownershipCheck(params.id, session.user.id);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json();
  const { name, amount, currency, startDate, renewalDate, durationMonths, category, isActive, planMeta } = body;

  if (category !== undefined && !(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const updated = await prisma.subscription.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: String(name) }),
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(currency !== undefined && { currency }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(renewalDate !== undefined && { renewalDate: new Date(renewalDate) }),
      ...(durationMonths !== undefined && { durationMonths: parseInt(durationMonths) }),
      ...(category !== undefined && { category }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      // planMeta: null explicitly clears it (category change away from telecom)
      ...("planMeta" in body && { planMeta: planMeta ?? null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await ownershipCheck(params.id, session.user.id);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  await prisma.subscription.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
