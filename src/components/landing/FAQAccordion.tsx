import type { Faq } from "@/lib/landingSchemas";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQAccordion({ items }: { items: Faq[] }) {
  if (!items?.length) return null;
  return (
    <section className="bg-muted/40 py-12 lg:py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <h2 className="text-center font-display text-3xl font-black lg:text-4xl">FAQ</h2>
        <Accordion type="single" collapsible className="mt-8">
          {items.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
