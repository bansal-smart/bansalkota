import BansalBadge from "@/components/bansal/BansalBadge";

const RefundPolicyPage = () => (
  <div className="bg-background">
    <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-14">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <BansalBadge tone="orange" className="mb-3">Legal</BansalBadge>
        <h1 className="font-display text-4xl font-extrabold">Refund Policy</h1>
        <p className="text-white/80 text-sm mt-2">Last updated: January 2026</p>
      </div>
    </section>
    <section className="py-12">
      <div className="container mx-auto px-4 max-w-3xl prose prose-sm md:prose-base">
        <h2 className="font-display text-bansal-blue">Course fee refunds</h2>
        <p>Refund requests for classroom (CLP) and distance learning (DLP) courses are processed as per the refund schedule published at the time of admission. The applicable refund amount depends on the date of the formal withdrawal request relative to the course start date.</p>
        <h2 className="font-display text-bansal-blue">Online courses & test series</h2>
        <p>Online digital products (live + recorded courses, test series) are non-refundable once the content has been accessed. If you face a technical issue that prevents access, please contact support within 7 days of purchase.</p>
        <h2 className="font-display text-bansal-blue">Books & printed material</h2>
        <p>Physical books may be returned within 7 days of delivery if the seal is intact and there are no signs of usage. Return shipping is the responsibility of the customer.</p>
        <h2 className="font-display text-bansal-blue">Processing time</h2>
        <p>Approved refunds are credited to the original payment method within 7–14 working days.</p>
        <h2 className="font-display text-bansal-blue">How to request</h2>
        <p>Email <a href="mailto:info@bansal.ac.in">info@bansal.ac.in</a> with your student ID, course name and reason. For classroom programs, please contact your center administration directly.</p>
      </div>
    </section>
  </div>
);

export default RefundPolicyPage;
