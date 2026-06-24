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
        <p>
          We refund course fees only till the 7th day from the date of course commencement — applicable to every course and phase, with no exceptions.
        </p>
        <p>
          If you join late, miss classes, or never attend a single session, the refund window still closes on the 7th day. Refunds are only possible out of the First Installment and before the dates stated in the Information Bulletin. No refund is allowed from the Second Installment, and no refund is given if you leave after the last refund date.
        </p>
        <h2 className="font-display text-bansal-blue">How to request a refund</h2>
        <p>
          Requests must be submitted in hard copy (fax, phone, SMS, or mobile requests are not accepted) personally or by post to: Account Manager, Bansal Classes, A-11(a), IPIA, Road No. 1, Kota, Rajasthan.
        </p>
        <p>
          Include your name, roll number, course, original receipt, ID card, and full bank details (bank name, account number, branch, and account holder name).
        </p>
        <h2 className="font-display text-bansal-blue">Processing time</h2>
        <p>
          Once the application is received and verified, refund is initiated within 10–15 working days.
        </p>
        <h2 className="font-display text-bansal-blue">Jurisdiction</h2>
        <p>
          For any legal dispute, jurisdiction is Kota (Rajasthan) only.
        </p>
      </div>
    </section>
  </div>
);

export default RefundPolicyPage;
