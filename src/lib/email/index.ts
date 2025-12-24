import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailParams = {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, body, replyTo }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    text: body,
    replyTo,
  });

  if (error) {
    console.error("Email send error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export async function sendLeadNotification(
  brokerEmail: string,
  lead: {
    name: string | null;
    email: string | null;
    score: number | null;
    intent: string | null;
    draftResponse: string | null;
  }
) {
  const subject = `New lead: ${lead.name || "Unknown"} (Score: ${lead.score || "?"}/100)`;
  
  const body = `
New enquiry received

Name: ${lead.name || "Not provided"}
Email: ${lead.email || "Not provided"}
Intent: ${lead.intent || "Unknown"}
Score: ${lead.score || "Not scored"}/100

AI Draft Response:
${lead.draftResponse || "No draft generated"}

---
Log in to review and respond: ${process.env.AUTH_URL}/admin/leads
`.trim();

  return sendEmail({
    to: brokerEmail,
    subject,
    body,
  });
}

export async function sendLeadResponse(
  toEmail: string,
  subject: string,
  body: string,
  brokerEmail: string
) {
  return sendEmail({
    to: toEmail,
    subject,
    body,
    replyTo: brokerEmail,
  });
}
