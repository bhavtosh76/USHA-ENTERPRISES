import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/),
  village: z.string().trim().max(100).optional(),
  capacityKw: z.coerce.number().min(0).max(1000).nullable().optional(),
  message: z.string().trim().max(800).optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`enquiry:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many enquiries. Please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill a valid name and 10 digit mobile number." }, { status: 422 });
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      name: parsed.data.name,
      mobile: parsed.data.mobile,
      village: parsed.data.village || null,
      capacityKw: parsed.data.capacityKw ?? null,
      message: parsed.data.message || null,
      source: "WEBSITE",
    },
  });

  await notifyAdmins({
    title: "New website enquiry",
    message: `${enquiry.name} (${enquiry.mobile})${enquiry.village ? ` — ${enquiry.village}` : ""} requested a solar consultation.`,
    type: "INFO",
    link: "/app/enquiries",
  });

  return NextResponse.json({ ok: true, id: enquiry.id });
}
