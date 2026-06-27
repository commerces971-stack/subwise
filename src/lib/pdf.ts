import PDFDocument from "pdfkit";

export interface MandatePdfParams {
  orderId: string;
  mandatSignedAt: Date;
  userFirstName: string;
  userLastName: string;
  userAddress: string;
  userCity: string;
  userZip: string;
  userEmail: string;
  providerName: string;
  providerAddress: string;
  providerCity: string;
  providerZip: string;
  subscriptionName: string;
  alternativeName: string;
  customerNumber?: string;
  contractRef?: string;
  rioCode?: string;
}

export function generateMandatePdf(params: MandatePdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 70 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const signedAt = new Date(params.mandatSignedAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const today = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#6366f1")
      .text("Subwise", { align: "left" })
      .moveDown(0.2)
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Plateforme de gestion d'abonnements — subwise.eu")
      .moveDown(1.5);

    // ── Sender (user) ─────────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#111827")
      .text(`${params.userFirstName} ${params.userLastName}`)
      .text(params.userAddress)
      .text(`${params.userZip} ${params.userCity}`)
      .moveDown(1.5);

    // ── Date + place ──────────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .text(`${params.userCity}, le ${today}`, { align: "right" })
      .moveDown(1.5);

    // ── Recipient ─────────────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(params.providerName.toUpperCase())
      .font("Helvetica")
      .text(params.providerAddress)
      .text(`${params.providerZip} ${params.providerCity.toUpperCase()}`)
      .moveDown(1.5);

    // ── Subject ───────────────────────────────────────────────────────────────
    doc
      .font("Helvetica-Bold")
      .text(`Objet : Résiliation de l'abonnement « ${params.subscriptionName} »`)
      .moveDown(0.5)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text("Lettre recommandée avec accusé de réception")
      .fillColor("#111827")
      .moveDown(1.5);

    // ── Body ──────────────────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Madame, Monsieur,", { paragraphGap: 6 })
      .moveDown(0.8);

    doc.text(
      `Par la présente lettre recommandée avec accusé de réception, je vous informe ` +
        `de ma décision de résilier mon abonnement « ${params.subscriptionName} » ` +
        `à compter de la date de réception de ce courrier.`,
      { lineGap: 4 }
    );
    doc.moveDown(0.8);

    if (params.customerNumber || params.contractRef) {
      const refs: string[] = [];
      if (params.customerNumber) refs.push(`Numéro de client : ${params.customerNumber}`);
      if (params.contractRef) refs.push(`Référence du contrat : ${params.contractRef}`);
      doc.text(refs.join("  ·  "), { lineGap: 4 });
      doc.moveDown(0.8);
    }

    if (params.rioCode) {
      doc.text(
        `Dans le cadre de la portabilité de mon numéro de téléphone, je vous communique ` +
          `mon code RIO (Relevé d'Identité Opérateur) : ${params.rioCode}. ` +
          `Je souhaite conserver mon numéro et le transférer vers mon nouvel opérateur. ` +
          `Je vous demande de traiter ce dossier de portabilité dans les délais légaux.`,
        { lineGap: 4 }
      );
      doc.moveDown(0.8);
    }

    doc.text(
      `Je vous demande de bien vouloir prendre en compte cette résiliation dans les ` +
        `meilleurs délais, conformément aux conditions générales en vigueur, et de ` +
        `m'en adresser une confirmation écrite.`,
      { lineGap: 4 }
    );
    doc.moveDown(0.8);

    doc.text(
      `Dans l'attente de votre retour, veuillez agréer, Madame, Monsieur, ` +
        `l'expression de mes salutations distinguées.`,
      { lineGap: 4 }
    );
    doc.moveDown(1.5);

    // ── Signature ─────────────────────────────────────────────────────────────
    doc
      .font("Helvetica-Bold")
      .text(`${params.userFirstName} ${params.userLastName}`)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text(params.userEmail);

    doc.moveDown(3);

    // ── Footer / mandate reference ────────────────────────────────────────────
    doc
      .moveTo(70, doc.y)
      .lineTo(doc.page.width - 70, doc.y)
      .strokeColor("#e5e7eb")
      .stroke()
      .moveDown(0.8);

    doc
      .fontSize(8)
      .fillColor("#9ca3af")
      .text(`Document généré et expédié via Subwise (subwise.eu)`, { align: "center" })
      .text(
        `Mandat électronique signé le ${signedAt} par ${params.userEmail}`,
        { align: "center" }
      )
      .text(`Référence de commande : ${params.orderId}`, { align: "center" })
      .text(
        `Alternative choisie : ${params.alternativeName}`,
        { align: "center" }
      );

    doc.end();
  });
}
