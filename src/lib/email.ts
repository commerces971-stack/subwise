import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

export interface TransitionConfirmationParams {
  to: string;
  userName: string;
  subscriptionName: string;
  alternativeName: string;
  providerName: string;
  mailevaSendId: string;
  orderId: string;
}

export async function sendTransitionConfirmationEmail({
  to,
  userName,
  subscriptionName,
  alternativeName,
  providerName,
  mailevaSendId,
  orderId,
}: TransitionConfirmationParams) {
  const dashboardUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard`;

  await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `Votre lettre recommandée a été envoyée — ${subscriptionName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827">
        <div style="background:#6366f1;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:700">Subwise</h1>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin:0 0 8px;color:#6b7280;font-size:14px">Bonjour ${userName},</p>
          <h2 style="margin:0 0 24px;font-size:20px;font-weight:700">
            Votre lettre recommandée a été envoyée ✓
          </h2>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 8px;font-size:14px;color:#166534;font-weight:600">
              Résiliation de « ${subscriptionName} » en cours
            </p>
            <p style="margin:0;font-size:13px;color:#15803d;line-height:1.6">
              Destinataire : <strong>${providerName}</strong><br>
              Alternative choisie : <strong>${alternativeName}</strong>
            </p>
          </div>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">
              Référence d'envoi Maileva
            </p>
            <p style="margin:0;font-family:monospace;font-size:14px;color:#111827">${mailevaSendId}</p>
            <p style="margin:8px 0 0;font-size:11px;color:#9ca3af">
              Référence commande Subwise : ${orderId}
            </p>
          </div>

          <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
            La lettre recommandée avec accusé de réception a été déposée auprès de nos
            partenaires postaux. Votre opérateur actuel recevra votre courrier dans
            les prochains jours ouvrés.
          </p>

          <a href="${dashboardUrl}"
             style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Voir mon tableau de bord
          </a>

          <p style="margin:32px 0 0;font-size:12px;color:#9ca3af">
            Conservez cet email comme preuve de votre démarche de résiliation.
          </p>
        </div>
      </div>
    `,
  });
}

interface J45EmailParams {
  to: string;
  userName: string;
  subscriptionName: string;
  renewalDate: Date;
  amount: number;
  currency: string;
}

export async function sendJ45Email({
  to,
  userName,
  subscriptionName,
  renewalDate,
  amount,
  currency,
}: J45EmailParams) {
  const formattedDate = new Date(renewalDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formattedAmount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(amount);

  const dashboardUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard`;

  await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `Rappel · ${subscriptionName} se renouvelle dans 45 jours`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827">
        <div style="background:#6366f1;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:700">Subwise</h1>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin:0 0 8px;color:#6b7280;font-size:14px">Bonjour ${userName},</p>
          <h2 style="margin:0 0 24px;font-size:22px;font-weight:700">Votre abonnement se renouvelle bientôt</h2>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 4px;font-size:18px;font-weight:600">${subscriptionName}</p>
            <p style="margin:0;color:#6b7280;font-size:14px">
              Renouvellement le <strong style="color:#111827">${formattedDate}</strong>
              · <strong style="color:#111827">${formattedAmount}</strong>
            </p>
          </div>

          <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
            Il vous reste <strong>45 jours</strong> pour décider de continuer, résilier ou
            chercher une alternative moins chère via Subwise.
          </p>

          <a href="${dashboardUrl}"
             style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Gérer mes abonnements
          </a>

          <p style="margin:32px 0 0;font-size:12px;color:#9ca3af">
            Vous recevez cet email car vous avez un compte Subwise.
            Ce rappel est automatique.
          </p>
        </div>
      </div>
    `,
  });
}
