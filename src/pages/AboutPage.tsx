import { Link } from "react-router-dom";
import { ArrowRight, Eye, Target, BookOpen, Quote } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalStat from "@/components/bansal/BansalStat";
import BansalBadge from "@/components/bansal/BansalBadge";
import {
  bansalStats,
  teachingMethodology,
  visionPoints,
  missionPoints,
  leadership,
} from "@/content/bansal/about";

const AboutPage = () => {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <BansalBadge tone="orange" className="mb-4">About Bansal Classes</BansalBadge>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold mb-4">
            Building Foundations for Lifelong Learning and Achievement
          </h1>
          <p className="text-white/85 text-lg">
            Since 1984, Bansal Classes has set the benchmark for JEE & NEET coaching in India — pioneering the Kota model of competitive exam preparation.
          </p>
        </div>
      </section>

      {/* History */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-display text-3xl font-bold text-bansal-blue mb-6">Our History</h2>
          <div className="space-y-4 text-bansal-gray leading-relaxed">
            <p>
              Mr. <strong>V.K. Bansal</strong> was born on 26 October 1949, in the Jhansi district of Uttar Pradesh. After graduating from the Indian Institute of Technology, Banaras Hindu University, he worked at J. K. Synthetics, a chemical company in Kota.
            </p>
            <p>
              In 1981, he recognised the need to provide proper guidance to JEE aspirants and dedicated himself to this cause. With his dedication and positive attitude, Bansal Classes produced wonderful results year after year — each batch challenging the next to perform even better.
            </p>
            <p>
              Accepting change and creating strategies accordingly is the quality of a true leader — and this is exactly what Bansal Classes has been doing for four decades: <em>adopting the methods that best suit our students to crack the JEE</em>.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-10 border-y border-border">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {bansalStats.map((s) => (
            <BansalStat key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* Teaching methodology */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <BansalBadge className="mb-3">Teaching Methodology</BansalBadge>
            <h2 className="font-display text-3xl font-bold text-bansal-blue">Every student learns differently</h2>
            <p className="text-bansal-gray mt-3">
              We incorporate a variety of teaching techniques to cater to diverse learning styles through these programs:
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {teachingMethodology.map((t) => (
              <BansalCard key={t.title}>
                <BookOpen className="h-8 w-8 text-bansal-orange mb-3" />
                <h3 className="font-display text-lg font-bold text-bansal-blue mb-2">{t.title}</h3>
                <p className="text-sm text-bansal-gray">{t.desc}</p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-bansal-cream py-16">
        <div className="container mx-auto px-4 grid gap-8 md:grid-cols-2">
          <BansalCard>
            <div className="flex items-center gap-3 mb-3">
              <Eye className="h-7 w-7 text-bansal-orange" />
              <h3 className="font-display text-2xl font-bold text-bansal-blue">Vision</h3>
            </div>
            <p className="italic text-bansal-gray mb-4">
              "Leadership is the capacity to translate vision into reality."
            </p>
            <p className="text-sm text-bansal-gray mb-4">
              As leaders in the field of informal education, we are dedicated to enriching lives by challenging students to become successful, lifelong learners who thrive in a diverse and ever-changing world.
            </p>
            <ul className="grid grid-cols-2 gap-y-1 text-sm text-bansal-blue font-medium">
              {visionPoints.map((v) => (
                <li key={v} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-bansal-orange" /> {v}
                </li>
              ))}
            </ul>
          </BansalCard>

          <BansalCard>
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-7 w-7 text-bansal-orange" />
              <h3 className="font-display text-2xl font-bold text-bansal-blue">Mission</h3>
            </div>
            <p className="italic text-bansal-gray mb-4">
              "Innovation distinguishes between a leader and a follower."
            </p>
            <p className="text-sm text-bansal-gray mb-4">
              Our objective is to ensure that all students have equal opportunities to excel in competitive examinations — by adopting the latest changes in JEE & NEET patterns and delivering quality teaching at every step.
            </p>
            <ul className="grid grid-cols-2 gap-y-1 text-sm text-bansal-blue font-medium">
              {missionPoints.map((v) => (
                <li key={v} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-bansal-orange" /> {v}
                </li>
              ))}
            </ul>
          </BansalCard>
        </div>
      </section>

      {/* Founder quote */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <Quote className="h-10 w-10 text-bansal-orange mx-auto mb-4" />
          <blockquote className="font-display text-xl md:text-2xl text-bansal-blue font-semibold leading-relaxed">
            "Believe in yourself and strive for excellence with unwavering dedication. Success comes to those who persevere through challenges with a positive mindset and a thirst for knowledge."
          </blockquote>
          <p className="mt-4 text-sm font-semibold text-bansal-gray">— V.K. Bansal, Founder</p>
        </div>
      </section>

      {/* Leadership */}
      <section className="bg-bansal-cream py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <BansalBadge className="mb-3">Our Leadership</BansalBadge>
            <h2 className="font-display text-3xl font-bold text-bansal-blue">Meet the visionaries behind our mission</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {leadership.map((l) => (
              <Link key={l.slug} to={`/about/${l.slug}`} className="group">
                <BansalCard className="text-center h-full">
                  <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-bansal-orange to-bansal-orange-dark text-white flex items-center justify-center font-display text-2xl font-bold mb-4">
                    {l.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <h3 className="font-display text-lg font-bold text-bansal-blue">{l.name}</h3>
                  <p className="text-xs text-bansal-orange font-semibold uppercase mt-1">{l.role}</p>
                  <p className="text-xs text-bansal-gray mt-2">{l.tagline}</p>
                  <span className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-bansal-blue group-hover:text-bansal-orange">
                    Read more <ArrowRight className="h-3 w-3" />
                  </span>
                </BansalCard>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-bansal-blue to-bansal-blue-dark text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display text-3xl font-bold mb-3">Join the Bansal Family</h2>
          <p className="text-white/85 mb-6">Talk to our admissions team or visit your nearest center.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact"><BansalButton variant="cta">Enquire Now</BansalButton></Link>
            <Link to="/centers"><BansalButton variant="ghost-white">Find a Center</BansalButton></Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
