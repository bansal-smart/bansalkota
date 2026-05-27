import BansalBadge from "@/components/bansal/BansalBadge";

const DisclaimerPage = () => (
  <div className="bg-background">
    <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-14">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <BansalBadge tone="orange" className="mb-3">Legal</BansalBadge>
        <h1 className="font-display text-4xl font-extrabold">Disclaimer</h1>
        <p className="text-white/80 text-sm mt-2">Last updated: January 2026</p>
      </div>
    </section>
    <section className="py-12">
      <div className="container mx-auto px-4 max-w-3xl prose prose-sm md:prose-base">
        <p>All content on this website — including text, images, videos, study material, test questions and rank information — is published for general informational purposes and for the benefit of Bansal Classes students.</p>
        <h2 className="font-display text-bansal-blue">Results</h2>
        <p>Ranks, results and testimonials published on this website belong to actual Bansal Classes students. Individual results vary and depend on each student's effort, attendance and consistency. We do not guarantee specific ranks or selection.</p>
        <h2 className="font-display text-bansal-blue">Third-party content</h2>
        <p>References to JEE, NEET, NTA, CBSE and other examination bodies are made solely to identify the relevant examination. Bansal Classes is not affiliated with or endorsed by these bodies.</p>
        <h2 className="font-display text-bansal-blue">Changes</h2>
        <p>Course fees, schedules, faculty allocation and study material may be revised from time to time without prior notice. The latest information published on our official website prevails.</p>
        <h2 className="font-display text-bansal-blue">Contact</h2>
        <p>For any clarification, write to <a href="mailto:info@bansal.ac.in">info@bansal.ac.in</a>.</p>
      </div>
    </section>
  </div>
);

export default DisclaimerPage;
