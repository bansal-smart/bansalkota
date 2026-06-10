import { User } from "lucide-react";

type Props = {
  name?: string | null;
  avatarUrl?: string | null;
  rollNo?: string | null;
};

const CandidateCard = ({ name, avatarUrl, rollNo }: Props) => {
  const initial = (name || "Candidate").trim().charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-neutral-300 bg-neutral-100">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
            {initial ? (
              <span className="text-lg font-black">{initial}</span>
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
          Candidate
        </p>
        <p className="truncate text-sm font-bold text-neutral-900">
          {name || "Candidate"}
        </p>
        {rollNo && (
          <p className="truncate text-[10px] text-neutral-500">
            Roll No: {rollNo}
          </p>
        )}
      </div>
    </div>
  );
};

export default CandidateCard;
