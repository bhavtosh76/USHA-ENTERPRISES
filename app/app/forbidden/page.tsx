import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";

export default async function ForbiddenPage() {
  const user = await requireUser();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-navy-900">Access restricted</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Aapke role (<strong>{user.roleName}</strong>) ke paas is page ki permission nahi hai.
          Zaroorat ho to Super Admin se permission update karwayein.
        </p>
        <Link href="/app" className="mt-5 inline-flex rounded-lg bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-navy-800">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
