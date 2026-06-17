import { CheckCircle2 } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import { Link } from "react-router-dom";

type Props = {
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onReset?: () => void;
  compact?: boolean;
};

/**
 * Branded post-submission confirmation block.
 * Used after Lead form / Enquiry / Payment submissions.
 */
const SubmissionSuccess = ({
  title = "Thank you! We've received your details.",
  message = "Our admissions team will reach out within the next 24 hours. Please keep your phone handy.",
  ctaLabel = "Back to Home",
  ctaTo = "/",
  onReset,
  compact,
}: Props) => {
  return (
    <div
      className={`rounded-2xl border border-bansal-orange/30 bg-gradient-to-br from-white via-bansal-cream/60 to-bansal-orange-light/40 text-center ${
        compact ? "p-6" : "p-8 md:p-10"
      } shadow-sm animate-fade-in`}
    >
      <div className="mx-auto h-14 w-14 rounded-full bg-bansal-orange/15 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-8 w-8 text-bansal-orange" />
      </div>
      <h3 className="font-display text-xl md:text-2xl font-extrabold text-bansal-black mb-2">
        {title}
      </h3>
      <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onReset && (
          <BansalButton variant="outline" onClick={onReset}>
            Submit another
          </BansalButton>
        )}
        <Link to={ctaTo}>
          <BansalButton variant="cta">{ctaLabel}</BansalButton>
        </Link>
      </div>
    </div>
  );
};

export default SubmissionSuccess;
