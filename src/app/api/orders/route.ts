export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, SERVICE_FEE_CENTS, MAILEVA_COST_CENTS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    subscriptionId,
    alternativeId,
    alternativeName,
    userAddress,     // { firstName, lastName, address, city, zip }
    providerAddress, // { name, address, city, zip }
    customerNumber,
    contractRef,
    rioCode,
  } = body;

  if (!subscriptionId || !alternativeName || !userAddress || !providerAddress || !customerNumber || !contractRef) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  // Verify subscription belongs to user
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId: session.user.id },
  });
  if (!subscription) {
    return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  }

  if (subscription.category === "téléphonie mobile") {
    if (!rioCode || typeof rioCode !== "string" || rioCode.length !== 12) {
      return NextResponse.json(
        { error: "Le code RIO (12 caractères) est obligatoire pour la téléphonie mobile" },
        { status: 400 }
      );
    }
  }

  // Create the TransitionOrder (pending, mandate signed now)
  const order = await prisma.transitionOrder.create({
    data: {
      subscriptionId,
      userId: session.user.id,
      status: "pending",
      serviceFee: SERVICE_FEE_CENTS / 100,
      mailevaCost: MAILEVA_COST_CENTS / 100,
      alternativeId: alternativeId ?? null,
      alternativeName,
      userAddress,
      providerAddress,
      customerNumber,
      contractRef,
      rioCode: rioCode ?? null,
      mandatSignedAt: new Date(),
    },
  });

  // Create Stripe Checkout Session
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Service Subwise — Assistance résiliation" },
          unit_amount: SERVICE_FEE_CENTS,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Lettre recommandée avec AR (via Maileva)" },
          unit_amount: MAILEVA_COST_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: { orderId: order.id },
    customer_email: session.user.email ?? undefined,
    success_url: `${baseUrl}/transition/success?order=${order.id}`,
    cancel_url: `${baseUrl}/dashboard?order=${order.id}&cancelled=1`,
  });

  return NextResponse.json({
    orderId: order.id,
    checkoutUrl: checkoutSession.url,
  });
}
