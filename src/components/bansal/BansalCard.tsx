import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const BansalCard = ({ className, children, ...rest }: Props) => (
  <div className={cn("bansal-card p-4 sm:p-5 md:p-6 hover-lift", className)} {...rest}>
    {children}
  </div>
);

export default BansalCard;
