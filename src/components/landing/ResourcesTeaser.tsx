import { Link } from "react-router-dom";
import { BookOpen, Sparkles, Youtube, FileText, ArrowRight, Brain } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";

const items = [
  {
    Icon: FileText,
    title: "PYQs & Sample Papers",
    desc: "20 years of JEE/NEET PYQs with detailed solutions — chapter-tagged for targeted practice.",
    to: "/resources/papers",
    tone: "bg-bansal-orange",
  },
  {
    Icon: Brain,
    title: "AI Doubt Solver",
    desc: "Snap a question, get a step-by-step solution in seconds — trained on Bansal pedagogy.",
    to: "/ai-doubts",
    tone: "bg-bansal-blue",
  },
  {
    Icon: Youtube,
    title: "Free Masterclasses",
    desc: "Weekly concept breakdowns by our IIT/AIIMS faculty — sharpen one chapter at a time.",
    to: "/live-classes",
    tone: "bg-bansal-orange",
  },
  {
    Icon: BookOpen,
    title: "NCERT Mastery Vault",
    desc: "Line-by-line NCERT decoded for NEET — concepts, MCQs and assertion-reason drills.",
    to: "/books",
    tone: "bg-bansal-blue",
  },
];

const ResourcesTeaser = () => (
  <section className="relative py-12 md:py-20 bg-gradient-to-br from-bansal-blue-light/40 via-white to-bansal-orange-light/30">
    <div className="container mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
        <BansalBadge tone="blue"><Sparkles className="h-3 w-3 mr-1" /> Free Forever</BansalBadge>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
          Start Studying the <span className="text-bansal-orange">Bansal Way</span> — Today
        </h2>
        <p className="mt-2 text-sm md:text-base text-bansal-gray">
          No credit card. No catch. Unlock the same resources used by 2L+ Bansal scholars across India and Dubai.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {items.map(({ Icon, title, desc, to, tone }) => (
          <Link
            key={title}
            to={to}
            className="group rounded-2xl bg-white border border-border p-5 hover-lift shadow-sm hover:shadow-xl transition-all flex flex-col"
          >
            <div className={`h-12 w-12 rounded-xl ${tone} text-white grid place-items-center shadow-md`}>
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display font-bold text-bansal-black text-base">{title}</h3>
            <p className="mt-1.5 text-sm text-bansal-gray flex-1">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue group-hover:text-bansal-orange">
              Open <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default ResourcesTeaser;
