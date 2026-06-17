import type { ContactBlock as TC } from "@/lib/landingSchemas";
import { Phone, MessageCircle, Mail, MapPin } from "lucide-react";

export default function ContactBlock({ contact }: { contact: TC }) {
  return (
    <section className="container mx-auto px-4 py-12 lg:py-16">
      <h2 className="text-center font-display text-3xl font-black lg:text-4xl">Need help? Talk to us</h2>
      <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex flex-col items-center rounded-lg border border-border bg-card p-5 text-center transition hover:border-primary">
            <Phone className="h-6 w-6 text-primary" />
            <div className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Call</div>
            <div className="mt-1 text-sm font-bold">{contact.phone}</div>
          </a>
        )}
        {contact.whatsapp && (
          <a href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="flex flex-col items-center rounded-lg border border-border bg-card p-5 text-center transition hover:border-primary">
            <MessageCircle className="h-6 w-6 text-primary" />
            <div className="mt-2 text-xs font-semibold uppercase text-muted-foreground">WhatsApp</div>
            <div className="mt-1 text-sm font-bold">{contact.whatsapp}</div>
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex flex-col items-center rounded-lg border border-border bg-card p-5 text-center transition hover:border-primary">
            <Mail className="h-6 w-6 text-primary" />
            <div className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Email</div>
            <div className="mt-1 text-sm font-bold break-all">{contact.email}</div>
          </a>
        )}
        {contact.address && (
          <div className="flex flex-col items-center rounded-lg border border-border bg-card p-5 text-center">
            <MapPin className="h-6 w-6 text-primary" />
            <div className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Visit</div>
            <div className="mt-1 text-sm font-bold">{contact.address}</div>
          </div>
        )}
      </div>
    </section>
  );
}
