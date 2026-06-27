import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { generateMandatePdf } from "@/lib/pdf";
import { sendRegisteredLetter } from "@/lib/maileva";
import { sendTransitionConfirmationEmail } from "@/lib/email";

// Next.js App Router — raw body is available via req.text(), no config needed
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  const orderId = checkoutSession.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId in metadata" }, { status: 400 });
  }

  // Mark as paid
  const order = await prisma.transitionOrder.update({
    where: { id: orderId },
    data: {
      status: "paid",
      stripePaymentId: checkoutSession.id,
    },
    include: {
      subscription: { select: { name: true } },
    },
  });

  // Load user for email + PDF
  const user = await prisma.user.findUnique({
    where: { id: order.userId },
    select: { email: true, name: true },
  });

  if (!user?.email) {
    console.error(`[stripe-webhook] User ${order.userId} has no email — skipping Maileva`);
    return NextResponse.json({ received: true });
  }

  const ua = order.userAddress as {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    zip: string;
  };
  const pa = order.providerAddress as {
    name: string;
    address: string;
    city: string;
    zip: string;
  };

  try {
    // Generate mandate PDF
    const pdfBuffer = await generateMandatePdf({
      orderId: order.id,
      mandatSignedAt: order.mandatSignedAt ?? order.createdAt,
      userFirstName: ua.firstName,
      userLastName: ua.lastName,
      userAddress: ua.address,
      userCity: ua.city,
      userZip: ua.zip,
      userEmail: user.email,
      providerName: pa.name,
      providerAddress: pa.address,
      providerCity: pa.city,
      providerZip: pa.zip,
      subscriptionName: order.subscription.name,
      alternativeName: order.alternativeName ?? "",
      customerNumber: order.customerNumber ?? undefined,
      contractRef: order.contractRef ?? undefined,
      rioCode: order.rioCode ?? undefined,
    });

    // Send via Maileva
    const { sendingId } = await sendRegisteredLetter({
      orderId: order.id,
      userEmail: user.email,
      recipientAddress: pa,
      pdfBuffer,
    });

    // Mark as sent
    await prisma.transitionOrder.update({
      where: { id: orderId },
      data: {
        status: "sent",
        mailevaSendId: sendingId,
        mandatPdfUrl: `maileva:${sendingId}`,
      },
    });

    // Send confirmation email
    await sendTransitionConfirmationEmail({
      to: user.email,
      userName: user.name ?? user.email,
      subscriptionName: order.subscription.name,
      alternativeName: order.alternativeName ?? "alternative choisie",
      providerName: pa.name,
      mailevaSendId: sendingId,
      orderId: order.id,
    });
  } catch (err) {
    // Log but don't fail the webhook — payment is already captured
    console.error(`[stripe-webhook] Post-payment processing failed for order ${orderId}:`, err);

    await prisma.transitionOrder.update({
      where: { id: orderId },
      data: { status: "error" },
    });
  }

  return NextResponse.json({ received: true });
}
