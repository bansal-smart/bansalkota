import BansalBadge from "@/components/bansal/BansalBadge";

const TermsOfServicePage = () => (
  <div className="bg-background">
    <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-14">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <BansalBadge tone="orange" className="mb-3">Legal</BansalBadge>
        <h1 className="font-display text-4xl font-extrabold">Terms & Conditions</h1>
        <p className="text-white/80 text-sm mt-2">Last updated: January 2026</p>
      </div>
    </section>
    <section className="py-12">
      <div className="container mx-auto px-4 max-w-3xl prose prose-sm md:prose-base">
        <p>By accessing the Bansal Classes website, mobile app or any of our offline centers, you agree to these Terms & Conditions.</p>
        <h2 className="font-display text-bansal-blue">Enrollment</h2>
        <p>Course enrollment is subject to availability of seats, fulfilment of eligibility criteria and payment of fees as published on our official channels. Bansal Classes reserves the right to accept or decline any application at its sole discretion.</p>
        <h2 className="font-display text-bansal-blue">Use of digital products</h2>
        <ul>
          <li>Login credentials are personal and non-transferable.</li>
          <li>Recording, downloading or redistributing our live classes, recorded lectures, notes or test material is strictly prohibited.</li>
          <li>We may suspend access in case of misuse, payment default or violation of these terms.</li>
        </ul>
        <h2 className="font-display text-bansal-blue">Conduct at centers</h2>
        <p>Students are expected to follow the discipline, attendance and conduct rules notified by their respective center. The center administration's decision is final on disciplinary matters.</p>
        <h2 className="font-display text-bansal-blue">Limitation of liability</h2>
        <p>Bansal Classes shall not be liable for indirect, incidental or consequential damages arising out of the use or inability to use our services. Outcomes in entrance exams depend on individual effort and several external factors.</p>
        <h2 className="font-display text-bansal-blue">Governing law</h2>
        <p>These terms are governed by the laws of India. All disputes are subject to the exclusive jurisdiction of courts in Kota, Rajasthan.</p>
      </div>
    </section>
  </div>
);

export default TermsOfServicePage;
