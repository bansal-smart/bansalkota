// PRPSMS shared module: template registry + sender + balance fetcher.
// Server-side only. Never import this from client code.

const PRPSMS_BASE = "http://164.52.195.161/API";

export const PRPSMS_SENDER_DEFAULT = "20190332";

export type TemplateName =
  | "PaymentGateway_OTP"
  | "CodeRed"
  | "Payment Confirmation-1"
  | "Result"
  | "Registration1"
  | "Login_URL"
  | "Login Credential-1"
  | "Roll_pwd"
  | "Reminder Message 1"
  | "Reminder Message 2"
  | "Test Submission"
  | "Absent_prnt"
  | "Information New"
  | "BFTP Updated"
  | "Application No."
  | "Bday_Wish"
  | "Recruitment"
  | "Result without Scholarship"
  | "ignore";

// Each template lists the ordered variable keys it expects. The renderer
// substitutes the {#var#} placeholders left-to-right with vars[key].
interface TemplateDef {
  body: string; // DLT-approved wording with {#var#} placeholders
  vars: string[]; // ordered variable keys
  description: string;
}

export const TEMPLATES: Record<TemplateName, TemplateDef> = {
  "PaymentGateway_OTP": {
    body: "Dear Applicant, {#var#} is your verification code for Online Application at Bansal Classes. Team Bansal",
    vars: ["otp"],
    description: "OTP for signup / login / password reset / sensitive actions",
  },
  "CodeRed": {
    body: "Dear Applicant, {#var#} is your verification code for Online Application at Bansal Classes. Team Bansal",
    vars: ["otp"],
    description: "Alternate OTP template",
  },
  "Payment Confirmation-1": {
    body: "Dear {#var#}, Thankyou for enrolling in BOOST Exam. We have received your payment. Your test date is {#var#} and time slot is {#var#}. Team BANSAL",
    vars: ["name", "test_date", "time_slot"],
    description: "Sent after successful payment",
  },
  "Result": {
    body: "Dear {#var#}, Result of Test {#var#} dated {#var#} {#var#} {#var#} Team Bansal",
    vars: ["name", "test_name", "date", "score", "rank"],
    description: "Result + rank declaration",
  },
  "Registration1": {
    body: "{#var#} BANSAL CLASSES, India's {#var#} Institute. {#var#} Coaching for IIT JEE, JEE Main. Visit {#var#} or CALL {#var#}.",
    vars: ["intro", "institute", "course", "visit_url", "call_no"],
    description: "Welcome / registration",
  },
  "Login_URL": {
    body: "Dear Student, Login at {#var#}{#var#}{#var#}. your {#var#} No. {#var#} and password is {#var#}. Team Bansal",
    vars: ["url1", "url2", "url3", "id_type", "id_no", "password"],
    description: "Login credentials with URL",
  },
  "Login Credential-1": {
    body: "Dear {#var#}, Download our app BANSAL LIVE ADMISSION from Playstore to appear in BOOST. Your registered number is {#var#}. You can login via OTP. Team BANSAL",
    vars: ["name", "phone"],
    description: "App login credentials",
  },
  "Roll_pwd": {
    body: "Dear {#var#}, your {#var#} No. {#var#} and password is {#var#}, date {#var#} and timing {#var#}. Team Bansal",
    vars: ["name", "id_type", "roll", "password", "date", "timing"],
    description: "Roll number + password",
  },
  "Reminder Message 1": {
    body: "Dear {#var#} Hope you are prepared. Your BOOST exam will start on {#var#} at {#var#}. Download our app BANSAL LIVE ADMISSION to appear in test. Team BANSAL",
    vars: ["name", "date", "time"],
    description: "Pre-test reminder (day before)",
  },
  "Reminder Message 2": {
    body: "Dear {#var#} Wishing you good luck. Your BOOST Exam will start today at {#var#} on our mobile app BANSAL LIVE ADMISSION. Team BANSAL",
    vars: ["name", "time"],
    description: "Pre-test reminder (day of)",
  },
  "Test Submission": {
    body: "Dear {#var#} We have received your test submission. Results will appear on our mobile app on {#var#} by {#var#}. Team BANSAL",
    vars: ["name", "result_date", "by_time"],
    description: "Test submission acknowledgement",
  },
  "Absent_prnt": {
    body: "Dear Parent, your ward found absent on dated {#var#}. Please talk to your ward. Team Bansal",
    vars: ["date"],
    description: "Parent — absent notice",
  },
  "Information New": {
    body: "Dear Parent, Your ward punched at Hostel Main Gate for {#var#} on {#var#} at {#var#}. This is for your Information. Team Bansal",
    vars: ["name", "date", "time"],
    description: "Parent — gate punch info",
  },
  "BFTP Updated": {
    body: "Dear Candidate, Your have cleared the BFTP Online test conducted on {#var#}.Kindly send your Resume and Video Lecture YouTube link of approx. duration 10 minutes to bftp@bansal.ac.in latest by {#var#}. For more details check your E-mail or call {#var#}. Team -BFTP",
    vars: ["test_date", "deadline", "contact"],
    description: "BFTP test cleared",
  },
  "Application No.": {
    body: "Dear {#var#}, Your Application No. {#var#} received on {#var#} Team Bansal",
    vars: ["name", "app_no", "date"],
    description: "Application number receipt",
  },
  "Bday_Wish": {
    body: "Dear {#var#}{#var#}, Today is a great day to get started on another 365-day journey. It's a fresh start to new beginnings, new hopes, and great endeavors. Besides, be sure to have adventures along the way. Wishing you the best of today and every day in the future! Happy Birthday from Bansal Family and Team Bansal !!",
    vars: ["salutation", "name"],
    description: "Birthday wish",
  },
  "Recruitment": {
    body: "Dear Candidate, Based on your registration with us for {#var#}, you are short listed for recruitment process to be held for Bansal Classes Pvt Ltd PAN India {#var#}.You are required to submit your {#var#} at {#var#} before {#var#} . Contact :{#var#}{#var#} Team-HR, Bansal Classes Pvt. Ltd.",
    vars: ["role", "process_no", "doc", "venue", "deadline", "contact1", "contact2"],
    description: "Recruitment shortlist",
  },
  "Result without Scholarship": {
    body: "Dear {#var#} Congratulations. You have secured {#var#}. For details please call at {#var#}. Team BANSAL",
    vars: ["name", "rank_or_score", "contact"],
    description: "Result without scholarship",
  },
  "ignore": {
    body: "Dear {#var#}, Please ignore previous message. Inconvenience is deeply regretted. Bansal Classes",
    vars: ["name"],
    description: "Ignore previous message",
  },
};

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([name, def]) => ({
    name,
    body: def.body,
    vars: def.vars,
    description: def.description,
  }));
}

export function renderTemplate(name: TemplateName, vars: Record<string, string | number>): string {
  const def = TEMPLATES[name];
  if (!def) throw new Error(`Unknown template: ${name}`);
  let out = def.body;
  for (const key of def.vars) {
    const v = vars[key];
    if (v === undefined || v === null || String(v).length === 0) {
      throw new Error(`Missing variable "${key}" for template "${name}"`);
    }
    out = out.replace("{#var#}", String(v));
  }
  if (out.includes("{#var#}")) {
    throw new Error(`Template "${name}" has unfilled placeholders`);
  }
  return out;
}

// Normalize an Indian phone to 10-digit local form for PRPSMS `dest`.
export function toDestNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  throw new Error(`Invalid Indian phone: ${phone}`);
}

// Normalize to E.164 (+91…) for internal storage.
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  throw new Error(`Invalid Indian phone: ${phone}`);
}

export interface PrpsmsSendResult {
  ok: boolean;
  msg_id?: string;
  raw: string;
  error?: string;
}

export async function prpsmsSend(opts: {
  to: string; // 10-digit
  body: string;
  schtm?: string; // optional schedule "yyyy-MM-dd HH:mm"
}): Promise<PrpsmsSendResult> {
  const uname = Deno.env.get("PRPSMS_UNAME");
  const pass = Deno.env.get("PRPSMS_PASS");
  const send = Deno.env.get("PRPSMS_SENDER") || PRPSMS_SENDER_DEFAULT;
  if (!uname || !pass) {
    return { ok: false, raw: "", error: "PRPSMS credentials not configured" };
  }
  const params = new URLSearchParams({
    uname,
    pass,
    send,
    dest: opts.to,
    msg: opts.body,
    priority: "1",
  });
  if (opts.schtm) params.set("schtm", opts.schtm);
  const url = `${PRPSMS_BASE}/SendMsg.aspx?${params.toString()}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const raw = (await res.text()).trim();
    // Successful response: 19-character message ID
    if (/^[A-Za-z0-9]{19}$/.test(raw)) {
      return { ok: true, msg_id: raw, raw };
    }
    return { ok: false, raw, error: raw || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, raw: "", error: (e as Error).message };
  }
}

export async function prpsmsBalance(): Promise<{ ok: boolean; balance?: number; raw: string; error?: string }> {
  const uname = Deno.env.get("PRPSMS_UNAME");
  const pass = Deno.env.get("PRPSMS_PASS");
  if (!uname || !pass) {
    return { ok: false, raw: "", error: "PRPSMS credentials not configured" };
  }
  const params = new URLSearchParams({ uname, pass });
  const url = `${PRPSMS_BASE}/BalAlert.aspx?${params.toString()}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const raw = (await res.text()).trim();
    const m = raw.match(/(-?\d+(\.\d+)?)/);
    if (m) {
      return { ok: true, balance: parseFloat(m[1]), raw };
    }
    return { ok: false, raw, error: raw || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, raw: "", error: (e as Error).message };
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
