import { cn } from "@/lib/utils";
import { LogoIcon } from "./LogoIcon";

interface LogoProps {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

export const Logo = ({
  className,
  textClassName,
  iconClassName,
}: LogoProps) => {
  return (
    <div className={cn(className, "flex items-center gap-3 text-left")}>
      <LogoIcon className={cn("size-8 shrink-0", iconClassName)} color="#d946ef" suffix="-full" />
      <div className="flex flex-col justify-center -mt-1">
        <span
          className={cn(
            textClassName,
            "font-sans text-xl font-semibold tracking-tight text-foreground",
          )}
        >
          open<span className="font-normal">front</span>
        </span>
        <span
          className={cn(
            "font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
          )}
        >
          Rental
        </span>
      </div>
    </div>
  );
};

export { LogoIcon };
