import BansalBadge from "@/components/bansal/BansalBadge";

const PrivacyPolicyPage = () => (
  <div className="bg-background">
    <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-14">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <BansalBadge tone="orange" className="mb-3">Legal</BansalBadge>
        <h1 className="font-display text-4xl font-extrabold">Privacy Policy</h1>
        <p className="text-white/80 text-sm mt-2">Last updated: January 2026</p>
      </div>
    </section>
    <section className="py-12">
      <div className="container mx-auto px-4 max-w-3xl prose prose-sm md:prose-base">
        <p>
          Bansal Classes Private Limited ("Bansal Classes", "we", "our") is committed to protecting the privacy of every student, parent and visitor who interacts with our website, mobile applications and offline centers.
        </p>
        <h2 className="font-display text-bansal-blue">Information we collect</h2>
        <ul>
          <li>Contact details you submit through enquiry, admission or career forms (name, email, phone, city).</li>
          <li>Academic information you provide when enrolling — class, target exam, school, board.</li>
          <li>Payment information processed via secure third-party gateways (we do not store card numbers).</li>
          <li>Usage data such as pages visited, time spent and device information.</li>
        </ul>
        <h2 className="font-display text-bansal-blue">How we use your information</h2>
        <ul>
          <li>To respond to admission and career enquiries.</li>
          <li>To deliver classes, tests, study material and academic support.</li>
          <li>To send transactional emails, schedule updates, and notifications relevant to your courses.</li>
          <li>To improve our products and services based on aggregated usage analytics.</li>
        </ul>
        <h2 className="font-display text-bansal-blue">Data sharing</h2>
        <p>
          We do not sell your personal information. We share data only with trusted service providers (hosting, payment gateways, communication tools) that help us operate, and only to the extent necessary.
        </p>
        <h2 className="font-display text-bansal-blue">Your rights</h2>
        <p>
          You may request access, correction or deletion of your personal information at any time by writing to <a href="mailto:info@bansal.ac.in">info@bansal.ac.in</a>.
        </p>
        <h2 className="font-display text-bansal-blue">Contact</h2>
        <p>
          Bansal Tower, A-10, Road No. 1, IPIA, Kota-324005, Rajasthan. Phone: +91 9773343246.
        </p>
      </div>
    </section>
  </div>
);

export default PrivacyPolicyPage;
