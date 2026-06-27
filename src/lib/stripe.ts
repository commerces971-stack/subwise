import Stripe from "stripe";

export const SERVICE_FEE_CENTS = 499;   // 4.99 €
export const MAILEVA_COST_CENTS = 650;  // 6.50 €
export const TOTAL_CENTS = SERVICE_FEE_CENTS + MAILEVA_COST_CENTS; // 11.49 €

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!));
}
