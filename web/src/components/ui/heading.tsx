import clsx from "clsx";

interface HeadingProps {
  title: string;
  badge?: number;
  description?: string;
  className?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  title,
  badge,
  description,
  className,
}) => {
  if (!badge) badge = 0;
  //console.log(`badge:${badge}`);
  return (
    <div className={clsx("", className)}>
      <strong className="relative inline-flex items-center rounded">
        {badge !== null && badge !== undefined && (
          <span className="absolute -top-1 -right-4 h-5 w-5 rounded-full bg-green-800 text-slate-100 flex justify-center items-center text-xs pb-1">
            <span>{badge}</span>
          </span>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
          {title}
        </h1>
      </strong>
      <div className="text-muted-foreground">{description}</div>
    </div>
  );
};
