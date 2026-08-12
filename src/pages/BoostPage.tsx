import { useState } from "react";
import { Calendar, IndianRupee, Clock, ChevronDown, FileText, FileDown } from "lucide-react";
import Seo from "@/components/Seo";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import boostHero from "@/assets/boost-hero-banner.png";
import { FloatingIcons, DotTexture } from "@/components/bansal/BansalDecor";
import BoostRegistrationModal from "@/components/BoostRegistrationModal";
import { useBoostSettings } from "@/hooks/useBoostSettings";
import { useSiteBanner } from "@/hooks/useSiteBanner";
import { useBoostSyllabus, boostSyllabusPublicUrl } from "@/hooks/useBoostSyllabus";
import {
  useBoostContent,
  resolveIcon,
  applyPriceToken,
  splitScholarship,
  isSpanRow,
  type ScholarshipRow,
} from "@/hooks/useBoostContent";

export default function BoostPage() {
  const [regOpen, setRegOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const boost = useBoostSettings();
  const { banner } = useSiteBanner("boost");
  const { content } = useBoostContent();
  const { legacy, benefits, examStructure, scholarshipGrid, notes, timeline, faqs } = content;
  const { rows: syllabusRows } = useBoostSyllabus();

  const renderScholarshipTable = (rows: ScholarshipRow[], startIndex: number) => (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-md">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-bansal-blue text-white font-semibold">
            <th className="p-3 border-b border-border text-center">Sr.No.</th>
            <th className="p-3 border-b border-border">Score in BOOST</th>
            <th className="p-3 border-b border-border text-center">% Scholarship</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-bansal-black">
          {rows.map((item, i) => (
            <tr key={startIndex + i} className="hover:bg-muted/30">
              <td className="p-3 text-center font-bold bg-muted/10">{startIndex + i + 1}</td>
              <td className="p-3 font-medium">{item.score}</td>
              <td className="p-3 text-center font-bold text-bansal-orange">{item.scholarship}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  const [scholarshipLeft, scholarshipRight] = splitScholarship(scholarshipGrid);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="BOOST Exam 2026 | Bansal Scholarship Test"
        description={`Register for BOOST, the Bansal Open Opportunity Scholarship Test. Up to 90% scholarship for Class V–XII students.${boost.nextExamDateLabel ? ` Next exam: ${boost.nextExamDateLabel}.` : ""} Check eligibility, exam dates and syllabus.`}
        path="/boost"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "EducationalOccupationalCredential",
          name: "Bansal Open Opportunity Scholarship Test (BOOST)",
          description: "National scholarship test by Bansal Classes offering up to 90% scholarship for Class V to XII students.",
          provider: { "@type": "EducationalOrganization", name: "Bansal Classes" },
        }}
      />
      <BoostRegistrationModal open={regOpen} onClose={() => setRegOpen(false)} />
      {/* Hero */}
      <section className="bg-bansal-blue text-white py-16 md:py-24 relative overflow-hidden">
        <img
          src={banner?.image_url || boostHero}
          alt="BOOST scholarship test — confident student surrounded by glowing science and math symbols"
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bansal-blue via-bansal-blue/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-bansal-blue/40 via-transparent to-bansal-blue/60 md:hidden" />
        <FloatingIcons defaultTone="white" className="opacity-30" />
        <DotTexture tone="white" className="opacity-15 decor-fade" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <BansalBadge variant="orange" className="mb-5">
              Bansal Flagship Scholarship Test
            </BansalBadge>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-5">
              {banner?.headline ? (
                banner.headline
              ) : (
                <>
                  BOOST <span className="text-bansal-orange">Scholarship Test</span>
                </>
              )}
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-8 max-w-2xl leading-relaxed">
              {banner?.subheading || (
                <>
                  Win up to <span className="text-bansal-orange font-bold">100% scholarship</span> on India's most
                  trusted JEE / NEET coaching at Bansal Classes, Kota. Just{" "}
                  <span className="font-bold">₹{boost.priceInr}</span> to register.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <BansalButton variant="cta" className="text-base px-8 py-4" onClick={() => setRegOpen(true)}>
                Register Now
              </BansalButton>
              <a href="#how-it-works">
                <BansalButton variant="ghost-white" className="text-base px-8 py-4">
                  How it works
                </BansalButton>
              </a>
            </div>
            {boost.examDateLabels.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {boost.examDateLabels.map((d, i) => {
                    const isNext = boost.nextExamDateLabel === d;
                    return (
                      <span key={d} className="inline-flex items-center gap-2">
                        <span
                          className={
                            isNext
                              ? "rounded-full bg-bansal-orange text-white px-4 py-1.5 text-sm font-bold ring-2 ring-white/40 shadow-lg"
                              : "rounded-full bg-white/15 text-white px-4 py-1.5 text-sm font-semibold"
                          }
                        >
                          {d}
                          {isNext && <span className="ml-2 text-[10px] uppercase tracking-wider">Upcoming</span>}
                        </span>
                        {i < boost.examDateLabels.length - 1 && <span aria-hidden="true" className="text-white/40">•</span>}
                      </span>
                    );
                  })}
                </div>
                {boost.applyBeforeLabel && <p className="text-xs text-white/70">{boost.applyBeforeLabel}</p>}
              </div>
            )}
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-xl">
              {[
                { v: "100%", l: "Max Scholarship" },
                { v: `₹${boost.priceInr}`, l: "Reg. Fee" },
                { v: "30K+", l: "Students/Year" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-3xl md:text-4xl font-bold text-bansal-orange">{s.v}</div>
                  <div className="text-sm text-white/70 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Introduction & What is BOOST */}
      <section className="py-16 md:py-20 bg-background border-b border-border/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
            <div className="md:col-span-5">
              <BansalBadge variant="blue" className="mb-4">
                {legacy.badge}
              </BansalBadge>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black leading-tight">
                {legacy.heading}
              </h2>
            </div>
            <div className="md:col-span-7 space-y-4 text-muted-foreground leading-relaxed text-sm md:text-base">
              <p>{legacy.body}</p>
              <p className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-bansal-black font-medium">
                <strong>{legacy.calloutTitle}</strong> {legacy.calloutBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20 bg-bansal-cream">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">
              Benefits of BOOST
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">Rewards Worth the Hustle</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {benefits.map((b) => {
              const Icon = resolveIcon(b.icon);
              return (
                <BansalCard key={b.title} className="hover-lift border border-border/40 p-6 flex flex-col justify-between">
                  <div>
                    <div className="h-12 w-12 rounded-lg bg-bansal-orange/10 text-bansal-orange flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-bansal-black mb-3">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </BansalCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOOST Details */}
      <section id="how-it-works" className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">
              Exam Structure
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">BOOST Details</h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-lg">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-bansal-blue text-white font-semibold">
                  <th className="p-4 border-b border-border">{examStructure.paramHeader}</th>
                  {examStructure.columns.map((c) => (
                    <th key={c} className="p-4 border-b border-border">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-bansal-black">
                {examStructure.rows.map((row) => (
                  <tr key={row.label} className="hover:bg-muted/30">
                    <td className="p-4 font-bold bg-muted/20">{row.label}</td>
                    {isSpanRow(row) ? (
                      <td
                        colSpan={examStructure.columns.length}
                        className="p-4 text-center font-medium bg-primary/5"
                      >
                        {row.href ? (
                          <a
                            href={row.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-semibold hover:underline"
                          >
                            {row.span}
                          </a>
                        ) : (
                          row.span
                        )}
                      </td>
                    ) : (
                      row.cells.map((cell, ci) => (
                        <td key={ci} className="p-4">
                          {cell}
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3 bg-muted/40 p-5 rounded-xl border border-border/60 text-xs text-muted-foreground">
            <p>
              <strong className="text-bansal-black">Legend:</strong> {examStructure.legend}
            </p>
            <p>
              <strong className="text-bansal-black">Marking Scheme:</strong> {examStructure.markingScheme}
            </p>
          </div>
        </div>
      </section>

      {/* Scholarship Matrix */}
      <section className="py-16 md:py-20 bg-bansal-cream border-t border-b border-border/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <BansalBadge variant="orange" className="mb-3">
              Scholarship Grid
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
              Scholarship Based on Performance in BOOST
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {renderScholarshipTable(scholarshipLeft, 0)}
            {renderScholarshipTable(scholarshipRight, scholarshipLeft.length)}
          </div>

          {/* Notes list */}
          <div className="mt-10 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-bansal-black border-b border-border/60 pb-2">
              Important Instructions &amp; Notes
            </h3>
            <ol className="list-decimal pl-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Syllabus & Sample Papers */}
      {syllabusRows.length > 0 && (
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <BansalBadge variant="blue" className="mb-3">
                Resources
              </BansalBadge>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
                Sample Paper And Syllabus
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-lg">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-bansal-blue text-white font-semibold">
                    <th className="p-4 border-b border-border">Class</th>
                    <th className="p-4 border-b border-border text-center">Sample Paper</th>
                    <th className="p-4 border-b border-border text-center">Syllabus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-bansal-black">
                  {syllabusRows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="p-4 font-bold bg-muted/10">{row.class_label}</td>
                      <td className="p-4 text-center">
                        {row.sample_paper_path ? (
                          <a
                            href={boostSyllabusPublicUrl(row.sample_paper_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" /> Get
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.syllabus_path ? (
                          <a
                            href={boostSyllabusPublicUrl(row.syllabus_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-bansal-orange/10 px-3 py-1.5 text-xs font-bold text-bansal-orange hover:bg-bansal-orange/20 transition-colors"
                          >
                            <FileDown className="h-3.5 w-3.5" /> Get
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Timeline */}
      <section className="py-16 md:py-20 bg-bansal-cream">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">
              Timeline
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
              From Registration to Scholarship
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {timeline.map((t, i) => (
              <BansalCard key={t.phase} className="relative">
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-bansal-orange text-white font-bold flex items-center justify-center text-sm shadow-md">
                  {i + 1}
                </div>
                <Calendar className="h-5 w-5 text-bansal-blue mb-3" />
                <h3 className="font-display font-bold text-bansal-black">{t.phase}</h3>
                <p className="text-bansal-orange text-xs font-bold uppercase tracking-wide mt-1">{t.date}</p>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {applyPriceToken(t.desc, boost.priceInr)}
                </p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <BansalBadge variant="blue" className="mb-3">
              FAQs
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const question = applyPriceToken(f.q, boost.priceInr);
              const answer = applyPriceToken(f.a, boost.priceInr);
              const isOpen = openFaqIndex === i;
              return (
                <div
                  key={question}
                  className="border border-border/60 rounded-xl bg-card hover:bg-muted/5 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-display font-semibold text-bansal-black hover:text-primary transition-colors focus:outline-none"
                  >
                    <span className="pr-4">{question}</span>
                    <span className={`transition-transform duration-300 shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary ${isOpen ? "rotate-180 bg-primary/10" : ""}`}>
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-[300px] border-t border-border/40" : "max-h-0"
                    }`}
                  >
                    <p className="p-5 text-sm text-muted-foreground leading-relaxed bg-background/5">
                      {answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-r from-bansal-blue/5 via-primary/5 to-bansal-orange/5 border border-border/40">
            <h3 className="font-display font-bold text-lg text-bansal-black mb-2">Still have questions?</h3>
            <p className="text-sm text-muted-foreground mb-4">We are here to help you guide your student's future. Get in touch with our support team.</p>
            <div className="flex justify-center gap-3">
              <a href="mailto:info@bansal.ac.in" className="inline-flex items-center justify-center rounded-lg bg-bansal-blue px-4 py-2 text-xs font-bold text-white hover:bg-bansal-blue/95 transition-colors">
                Email Support
              </a>
              <a href="/centres" className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-xs font-bold text-bansal-black hover:bg-muted transition-colors">
                Contact Study Centres
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-bansal-blue text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <IndianRupee className="h-12 w-12 text-bansal-orange mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Your future called — at just ₹{boost.priceInr}.
          </h2>
          <p className="text-white/80 mb-7">
            Register on the official Bansal Classes portal and lock in your BOOST slot today.
          </p>
          <BansalButton variant="cta" className="text-base px-10 py-4" onClick={() => setRegOpen(true)}>
            Fill an Application
          </BansalButton>
          <p className="mt-4 text-xs text-white/60 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> Refer dates from Page
          </p>
        </div>
      </section>
    </div>
  );
}
