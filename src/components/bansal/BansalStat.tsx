interface Props {
  value: string;
  label: string;
}

const BansalStat = ({ value, label }: Props) => (
  <div className="text-center">
    <div className="font-display text-3xl md:text-4xl font-extrabold text-bansal-orange">{value}</div>
    <div className="mt-1 text-xs md:text-sm font-medium text-bansal-gray">{label}</div>
  </div>
);

export default BansalStat;
