interface HeadingProps {
  title: string;
  badge?: number;
  description: string;
}

export const Heading: React.FC<HeadingProps> = ({
  title,
  badge,
  description,
}) => {
  //console.log(`badge:${badge}`);
  return (
    <div>
      <strong className="relative inline-flex items-center rounded">
        {badge !== null && badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-4 h-5 w-5 rounded-full bg-green-800 text-slate-100 flex justify-center items-center text-xs pb-1">
            <span>{badge}</span>
          </span>
        )}
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      </strong>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  );
};
