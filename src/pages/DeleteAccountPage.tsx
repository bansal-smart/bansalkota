import { Clock3, Mail, ShieldCheck, Trash2 } from "lucide-react";
import Seo from "@/components/Seo";
import BansalBadge from "@/components/bansal/BansalBadge";

const REQUEST_EMAIL = "admin@bansal.ac.in";
const requestSubject = "Bansal App Account Deletion Request";
const requestBody = [
  "Hello Bansal Classes Support,",
  "",
  "I want to permanently delete my Bansal app account and associated data.",
  "",
  "Registered email address or mobile number:",
  "Full name:",
  "",
  "I understand that this action cannot be undone.",
].join("\n");
const requestHref = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(requestSubject)}&body=${encodeURIComponent(requestBody)}`;

const DeleteAccountPage = () => (
  <div className="min-h-screen bg-background">
    <Seo
      title="Delete Your Bansal App Account"
      description="Request permanent deletion of your Bansal app account and associated personal data."
      path="/delete-account"
    />

    <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark py-14 text-white">
      <div className="container mx-auto max-w-3xl px-4 text-center">
        <BansalBadge tone="orange" className="mb-3">
          Account &amp; Data
        </BansalBadge>
        <h1 className="font-display text-4xl font-extrabold">Delete your Bansal account</h1>
        <p className="mt-4 text-white/85">
          This page is for users of the Bansal app, provided by Bansal Classes, who want their account and associated
          data permanently deleted.
        </p>
      </div>
    </section>

    <section className="py-12">
      <div className="container mx-auto max-w-3xl space-y-10 px-4 text-foreground">
        <div>
          <h2 className="font-display text-2xl font-bold text-bansal-blue">How to request deletion</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-6 leading-relaxed">
            <li>
              Email <a className="font-semibold text-bansal-orange underline" href={requestHref}>{REQUEST_EMAIL}</a> from
              your registered email address. If you registered using a mobile number, include that number in the email.
            </li>
            <li>Use the subject &quot;Bansal App Account Deletion Request&quot; and include your full name.</li>
            <li>We may contact you to verify that you own the account. Never send your password or one-time password.</li>
            <li>After verification, we will complete the deletion request within 30 days and confirm by email.</li>
          </ol>
          <a
            href={requestHref}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-bansal-orange px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-bansal-orange-dark focus:outline-none focus:ring-2 focus:ring-bansal-orange focus:ring-offset-2"
          >
            <Mail className="h-4 w-4" />
            Request account deletion
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-6">
            <Trash2 className="mb-3 h-6 w-6 text-bansal-orange" />
            <h2 className="font-display text-xl font-bold text-bansal-blue">Data that will be deleted</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Your login account and profile information, including your name, email address, and mobile number.</li>
              <li>Course enrolments, learning progress, saved activity, and preferences linked to your account.</li>
              <li>Test and quiz attempts, results, notifications, and other account-linked app records.</li>
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-card p-6">
            <ShieldCheck className="mb-3 h-6 w-6 text-bansal-orange" />
            <h2 className="font-display text-xl font-bold text-bansal-blue">Data that may be retained</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                Transaction, order, invoice, and payment records may be retained for up to 8 financial years when
                required for tax, accounting, fraud prevention, dispute resolution, or other legal obligations.
              </li>
              <li>De-identified or aggregated information that can no longer be connected to you may be retained.</li>
            </ul>
          </article>
        </div>

        <div className="rounded-xl bg-muted p-6">
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-bansal-orange" />
            <div>
              <h2 className="font-display text-lg font-bold text-bansal-blue">Deletion and backup period</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Account deletion is completed within 30 days after verification. Deleted data may remain in encrypted
                backups for up to 90 additional days before it is removed through the normal backup lifecycle. It will
                not be used for normal business operations during that period.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Need help? Contact <a className="font-semibold text-bansal-orange underline" href={`mailto:${REQUEST_EMAIL}`}>{REQUEST_EMAIL}</a>.
        </p>
      </div>
    </section>
  </div>
);

export default DeleteAccountPage;
