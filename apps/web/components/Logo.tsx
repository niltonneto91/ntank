import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className }: LogoProps) {
  return (
    <span
      className={["inline-flex items-center gap-3", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        src="/ntank-logo.png"
        alt="NTANK"
        width={size}
        height={size}
        priority
        className="rounded"
      />
      <span className="font-title text-xl font-extrabold tracking-tight">
        <span className="text-verde">N</span>TANK
      </span>
    </span>
  );
}
