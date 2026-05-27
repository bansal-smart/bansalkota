import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Quote } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalCard from "@/components/bansal/BansalCard";
import BansalButton from "@/components/bansal/BansalButton";

type Profile = {
  name: string;
  role: string;
  tags: string[];
  quote: string;
  intro: string;
  sections: { title: string; body: string }[];
  recognition?: string;
};

const profiles: Record<string, Profile> = {
  "vk-bansal": {
    name: "VK Bansal",
    role: "Founder, Bansal Classes",
    tags: ["Founder", "Visionary Educator", "Forever Honored"],
    quote:
      "Believe in yourself and strive for excellence with unwavering dedication. Success comes to those who persevere through challenges with a positive mindset and a thirst for knowledge.",
    intro:
      "VK Bansal was born on October 26, 1949, in the Jhansi district of Uttar Pradesh. His father was a government employee and his mother a homemaker. He graduated from the Indian Institute of Technology at Banaras Hindu University and worked at J. K. Synthetics in Kota before founding Bansal Classes in 1981 to provide proper guidance to JEE aspirants.",
    sections: [
      {
        title: "Guiding Teachers",
        body: "VK Bansal aimed for comprehensive JEE exam guidance through a structured curriculum and innovative teaching, offering personalised support and motivation. His holistic approach empowered students to master the syllabus and confidently face exam challenges.",
      },
      {
        title: "Disciplinary Atmosphere",
        body: "He continuously evolved teaching methods to meet students' diverse needs, integrating the latest educational technologies to enhance understanding and performance. His adaptive approach ensured students were always well-prepared.",
      },
      {
        title: "Setting High Standards",
        body: "Year after year, his leadership pushed boundaries in academic excellence — challenging both students and educators to strive for higher performance and fostering a culture of continuous improvement within Bansal Classes.",
      },
      {
        title: "Building a Legacy",
        body: "VK Bansal aimed to leave a lasting impact on education by setting benchmarks in coaching innovation and success. His efforts revolutionised educational practices and continue to elevate student achievement across India.",
      },
    ],
    recognition:
      "Though his untimely passing left a void in the educational community, his contributions continue to shape the lives of aspiring engineers across India. Remembering VK Bansal — a mentor, a visionary, a legend.",
  },
  "sameer-bansal": {
    name: "Sameer Bansal",
    role: "Managing Director & CEO, Bansal Classes Kota",
    tags: ["Mathematics Expert", "IITian Mentor", "Visionary Leader"],
    quote:
      "Success is not just about hard work — it's about smart strategy and relentless focus.",
    intro:
      "Sameer Bansal leads Bansal Classes, Kota — one of India's most prestigious coaching institutes for IIT-JEE & NEET. Known for his deep academic roots and modern leadership, he continues the legacy of founder VK Bansal by blending excellence, discipline and innovation.",
    sections: [
      {
        title: "Leadership Philosophy",
        body: "Emphasises smart and strategic learning for success, with a strong student-first approach that adapts to evolving JEE and NEET exam patterns. Author of renowned mathematics books used by aspirants nationwide.",
      },
      {
        title: "Modern Outlook",
        body: "Drives the institute's transition into a hybrid offline + online ecosystem — bringing live classes, recorded lectures, smart test series and AI-assisted doubt solving to every Bansal student.",
      },
    ],
    recognition:
      "Widely praised by both students and educators, Sameer Bansal is considered a 'Mathematical Gem' and a pillar of academic excellence.",
  },
  "mahima-bansal": {
    name: "Mahima Bansal",
    role: "Director & Academic Mentor, Bansal Classes Kota",
    tags: ["Academic Leader", "Mentor", "Women in Education"],
    quote:
      "Education is not just about achieving ranks, it's about nurturing purpose, passion and perseverance.",
    intro:
      "Mahima Bansal plays a pivotal role in upholding the academic excellence and administrative vision of Bansal Classes. With a strong educational background and commitment to empowering students, she bridges traditional values with modern pedagogical approaches.",
    sections: [
      {
        title: "Leadership & Initiatives",
        body: "Drives academic planning and student mentorship at Bansal Classes. Actively involved in performance tracking, learning enhancement and a student-first philosophy that motivates aspirants to perform with balance and confidence.",
      },
      {
        title: "Mentoring the Next Generation",
        body: "Anchors faculty development and student support programs that have made Bansal a name synonymous with results — championing women in education along the way.",
      },
    ],
    recognition:
      "Mahima Bansal is admired for her professional contributions and her ability to connect personally with students, offering them a nurturing and motivating environment. Her presence is a driving force behind the continued success and modernisation of the Bansal legacy.",
  },
  "neelam-bansal": {
    name: "Neelam Bansal",
    role: "Co-founder & Matriarch, Bansal Classes Kota",
    tags: ["Inspiration", "Pillar of Strength", "Visionary Support"],
    quote:
      "Behind every strong institution is a woman who nurtures it with selfless strength and unconditional support.",
    intro:
      "Mrs. Neelam Bansal has been the unwavering support system and guiding light behind the incredible success of Bansal Classes. As the wife of the legendary Mr. V.K. Bansal and mother of Mr. Sameer Bansal, her dedication, strength and wisdom have shaped the values and culture of the institution.",
    sections: [
      {
        title: "Legacy & Values",
        body: "Embodies compassion and resilience as the cornerstone of Bansal Classes. Provided silent leadership and moral guidance during the formative years of the institute — a source of emotional strength for students, teachers and family alike.",
      },
    ],
    recognition:
      "Though often away from the spotlight, Mrs. Neelam Bansal's role has been foundational to the success of the Bansal family and its legacy in Indian education — a symbol of grace, strength and silent determination.",
  },
};

export default function LeadershipDetailPage() {
  const { slug = "" } = useParams();
  const profile = profiles[slug];
  if (!profile) return <Navigate to="/about" replace />;

  const initials = profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="bg-background">
      <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-14">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link to="/about" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to About
          </Link>
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-gradient-to-br from-bansal-orange to-bansal-orange-dark text-white flex items-center justify-center font-display text-4xl font-bold shrink-0 shadow-blue">
              {initials}
            </div>
            <div className="text-center md:text-left">
              <h1 className="font-display text-3xl md:text-4xl font-extrabold">{profile.name}</h1>
              <p className="text-bansal-orange font-semibold mt-1">{profile.role}</p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                {profile.tags.map((t) => (
                  <BansalBadge key={t} tone="orange">{t}</BansalBadge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-bansal-gray leading-relaxed">{profile.intro}</p>

          <div className="my-10 border-l-4 border-bansal-orange bg-bansal-cream p-6 rounded-r-lg">
            <Quote className="h-6 w-6 text-bansal-orange mb-2" />
            <p className="font-display italic text-bansal-blue text-lg">"{profile.quote}"</p>
          </div>

          <div className="space-y-8">
            {profile.sections.map((s) => (
              <BansalCard key={s.title}>
                <h3 className="font-display text-xl font-bold text-bansal-blue mb-2">{s.title}</h3>
                <p className="text-sm text-bansal-gray leading-relaxed">{s.body}</p>
              </BansalCard>
            ))}
          </div>

          {profile.recognition && (
            <div className="mt-10 p-6 rounded-lg bg-bansal-blue text-white">
              <h4 className="font-display text-lg font-bold mb-2 text-bansal-orange">Recognition</h4>
              <p className="text-sm text-white/85 leading-relaxed">{profile.recognition}</p>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link to="/contact"><BansalButton variant="primary">Enquire Now</BansalButton></Link>
            <Link to="/about"><BansalButton variant="outline">Back to Leadership</BansalButton></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
