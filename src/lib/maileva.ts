export interface MailevaAddress {
  name: string;
  address: string;
  city: string;
  zip: string;
}

interface MailevaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getAccessToken(): Promise<string> {
  const { MAILEVA_CLIENT_ID, MAILEVA_CLIENT_SECRET, MAILEVA_API_URL } = process.env;
  if (!MAILEVA_CLIENT_ID || !MAILEVA_CLIENT_SECRET) {
    throw new Error("Maileva credentials not configured");
  }

  const res = await fetch(`${MAILEVA_API_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: MAILEVA_CLIENT_ID,
      client_secret: MAILEVA_CLIENT_SECRET,
      scope: "mail.v2",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Maileva auth failed: ${text}`);
  }

  const data = (await res.json()) as MailevaTokenResponse;
  return data.access_token;
}

export interface SendLetterParams {
  orderId: string;
  userEmail: string;
  recipientAddress: MailevaAddress;
  pdfBuffer: Buffer;
}

export interface MailevaSendResult {
  sendingId: string;
  trackingUrl: string | null;
}

export async function sendRegisteredLetter({
  orderId,
  userEmail,
  recipientAddress,
  pdfBuffer,
}: SendLetterParams): Promise<MailevaSendResult> {
  const apiUrl = process.env.MAILEVA_API_URL!;
  const token = await getAccessToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1 — Create sending
  const sendingRes = await fetch(`${apiUrl}/mail/v2/sendings`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `Subwise - Résiliation ${orderId}`,
      custom_id: orderId,
      postage_type: "LR",         // Lettre Recommandée
      color_printing: false,
      duplex_printing: false,
      optional_address_sheet: false,
      notification_email: userEmail,
    }),
  });

  if (!sendingRes.ok) {
    throw new Error(`Maileva create sending failed: ${await sendingRes.text()}`);
  }

  const sending = (await sendingRes.json()) as { id: string };
  const sendingId = sending.id;

  // 2 — Upload the PDF document
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }),
    "mandat-resiliation.pdf"
  );
  formData.append("metadata", JSON.stringify({ priority: 1 }));

  const docRes = await fetch(`${apiUrl}/mail/v2/sendings/${sendingId}/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!docRes.ok) {
    throw new Error(`Maileva upload document failed: ${await docRes.text()}`);
  }

  // 3 — Add recipient
  const recipRes = await fetch(`${apiUrl}/mail/v2/sendings/${sendingId}/recipients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      address_line_1: recipientAddress.name.toUpperCase(),
      address_line_4: recipientAddress.address.toUpperCase(),
      address_line_6: `${recipientAddress.zip} ${recipientAddress.city.toUpperCase()}`,
      country_code: "FR",
    }),
  });

  if (!recipRes.ok) {
    throw new Error(`Maileva add recipient failed: ${await recipRes.text()}`);
  }

  // 4 — Submit the sending
  const submitRes = await fetch(`${apiUrl}/mail/v2/sendings/${sendingId}/submit`, {
    method: "POST",
    headers,
  });

  if (!submitRes.ok) {
    throw new Error(`Maileva submit failed: ${await submitRes.text()}`);
  }

  return {
    sendingId,
    trackingUrl: `${apiUrl}/mail/v2/sendings/${sendingId}`,
  };
}
