import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  inverse?: boolean;
};

export default function BrandMark({ href, inverse = false }: BrandMarkProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`grid size-9 place-items-center rounded-[11px] text-base font-black tracking-[-0.08em] ${inverse ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}
      >
        ZQ
      </span>
      <span className="text-[15px] font-black tracking-[-0.02em]">ZeroQ</span>
    </>
  );
  const className = `inline-flex min-h-11 items-center gap-2.5 ${inverse ? "text-white" : "text-slate-950"}`;

  return href ? (
    <Link href={href} className={`${className} focus-ring rounded-xl pr-2`} aria-label="ZeroQ 홈">
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
