export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendJ45Email } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET (set automatically by Vercel, manually in .env for local tests)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Allow overriding "today" via ?date=YYYY-MM-DD for local testing
  const dateParam = req.nextUrl.searchParams.get("date");
  const now = dateParam ? new Date(dateParam) : new Date();

  // Build the UTC day window for today+45
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const targetStart = new Date(todayUTC);
  targetStart.setUTCDate(targetStart.getUTCDate() + 45);
  const targetEnd = new Date(targetStart);
  targetEnd.setUTCDate(targetEnd.getUTCDate() + 1);

  // 24h window for dedup (prevents double-send if cron is retried the same day)
  const oneDayAgo = new Date(todayUTC);
  oneDayAgo.setUTCDate(oneDayAgo.getUTCDate() - 1);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      isActive: true,
      renewalDate: { gte: targetStart, lt: targetEnd },
      notifications: {
        none: {
          type: "j45",
          sentAt: { gte: oneDayAgo },
        },
      },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    if (!sub.user.email) {
      failed++;
      continue;
    }

    try {
      await sendJ45Email({
        to: sub.user.email,
        userName: sub.user.name ?? sub.user.email,
        subscriptionName: sub.name,
        renewalDate: sub.renewalDate,
        amount: sub.amount,
        currency: sub.currency,
      });

      await prisma.notification.create({
        data: {
          userId: sub.userId,
          subscriptionId: sub.id,
          type: "j45",
          sentAt: new Date(),
        },
      });

      sent++;
    } catch (err) {
      failed++;
      errors.push(`${sub.name} (${sub.user.email}): ${err}`);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total: subscriptions.length,
    ...(errors.length > 0 && { errors }),
  });
}
