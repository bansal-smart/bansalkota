import { useState } from "react";
import { Plus, Minus, HelpCircle } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";

const faqs = [
  {
    q: "Is Bansal Classes really the original Kota institute?",
    a: "Yes. Bansal Classes was founded in 1981 by Shri V. K. Bansal in Kota and pioneered the IIT-JEE coaching model that became the Kota legacy.",
  },
  {
    q: "Which exams do you prepare students for?",
    a: "JEE Main, JEE Advanced, NEET-UG, Foundation (Class VI–X), NTSE & Olympiads. Dedicated batches exist for repeaters and droppers.",
  },
  {
    q: "Can I learn online or only in classroom?",
    a: "Both. Choose Classroom Learning Programs (CLP) at any of our 100+ centres, or fully online Live Classes with the same faculty and study material.",
  },
  {
    q: "What is the BOOST scholarship and how do I qualify?",
    a: "BOOST is our annual scholarship test open to Classes V–XII. You can win up to 90% off on tuition. Register at ₹99 and appear on any of the scheduled Sundays.",
  },
  {
    q: "Is there a fee refund policy?",
    a: "Yes. A full 7-day no-questions-asked refund applies on every online course. Classroom programs follow the standard Bansal admission policy.",
  },
  {
    q: "Will I get a personal mentor?",
    a: "Every Bansal student is assigned a personal mentor — a senior teacher who tracks attendance, test performance and concept gaps every single week.",
  },
  {
    q: "Is there support for parents to track progress?",
    a: "Yes. Parents receive weekly mentor reports, test analytics and class attendance summaries via WhatsApp and the parent portal.",
  },
  {
    q: "Do you have a centre in my city?",
    a: "Bansal operates 100+ centres across India and Dubai. Use the Centres section above to find the one nearest you — or learn online with the same faculty.",
  },
  {
    q: "What makes Bansal different from other coaching brands?",
    a: "Refined pedagogy since 1981, IIT/AIIMS alumni faculty, a legendary printed study material set and a results-first culture that has produced more than 1,00,000+ IITians and doctors.",
  },
];

const LandingFAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="relative py-12 md:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <BansalBadge tone="blue">
            <HelpCircle className="h-3 w-3 mr-1" /> Before You Decide
          </BansalBadge>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
            Questions Parents & Students <span className="text-bansal-orange">Always Ask</span>
          </h2>
        </div>
        <div className="divide-y divide-border rounded-2xl border border-border bg-bansal-cream/30 overflow-hidden">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <button
                key={f.q}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full text-left px-5 py-4 hover:bg-white transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display font-bold text-bansal-black text-sm md:text-base">{f.q}</span>
                  <span className="shrink-0 h-7 w-7 rounded-full bg-bansal-blue text-white grid place-items-center mt-0.5">
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </div>
                {isOpen && <p className="mt-3 text-sm text-bansal-gray leading-relaxed">{f.a}</p>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingFAQ;
