import { Link } from "react-router-dom";
import { ArrowRight, Eye, Target, BookOpen, Quote, Heart, Sparkles } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalStat from "@/components/bansal/BansalStat";
import BansalBadge from "@/components/bansal/BansalBadge";
import vkBansalPortrait from "@/assets/vk-bansal-portrait.jpg";
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
      {/* Hero — Founder tribute */}
      <section className="relative bg-gradient-to-br from-bansal-blue via-bansal-blue to-bansal-blue-dark text-white overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-50" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-bansal-orange/25 blur-3xl" />
        <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative container mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-12 gap-10 items-center">
          {/* Portrait */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative max-w-sm mx-auto lg:max-w-none">
              <div className="absolute -inset-4 bg-gradient-to-br from-bansal-orange/40 to-transparent blur-2xl rounded-full" />
              <div className="relative rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl bg-bansal-blue-dark">
                <img
                  src={vkBansalPortrait}
                  alt="Shri V.K. Bansal — Founder of Bansal Classes"
                  className="w-full h-auto object-cover"
                  width={896}
                  height={1152}
                  loading="eager"
                />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-bansal-orange text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap">
                <Heart className="h-4 w-4 fill-white" />
                <span className="text-xs font-bold uppercase tracking-wide">Forever Honored</span>
              </div>
            </div>
          </div>

          {/* Tribute copy */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <BansalBadge tone="orange" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" /> About Bansal Classes
            </BansalBadge>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
              Born from a Father's Vision.
              <span className="block text-bansal-orange mt-2">Carried by a Family's Promise.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/85 leading-relaxed">
              Shri <strong>V.K. Bansal</strong> founded Bansal Classes in 1981 with one belief — that every aspirant deserves <em>ideal guidance</em>. Four decades later, he remains our guiding light, our enduring inspiration, and the soul of every classroom that bears his name.
            </p>
            <blockquote className="mt-6 border-l-4 border-bansal-orange pl-5 italic text-white/90">
              "Believe in yourself and strive for excellence with unwavering dedication."
              <span className="block mt-2 text-xs font-semibold not-italic text-bansal-orange">— V.K. Bansal, Founder</span>
            </blockquote>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/about/vk-bansal">
                <BansalButton variant="cta">
                  Read His Full Story <ArrowRight className="h-4 w-4" />
                </BansalButton>
              </Link>
              <Link to="/centers">
                <BansalButton variant="ghost-white">Visit a Centre</BansalButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Legacy stats */}
      <section className="bg-white py-10 border-b border-border">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {bansalStats.map((s) => (
            <BansalStat key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* History */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <BansalBadge tone="blue" className="mb-3">Our Story</BansalBadge>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-bansal-blue mb-6">From a Single Classroom in Kota to a Pan-India Legacy</h2>
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
