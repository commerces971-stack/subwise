export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const [{ getServerSession }, { authOptions }, { prisma }] = await Promise.all([
    import("next-auth"),
    import("@/lib/auth"),
    import("@/lib/prisma"),
  ]);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get("category");
  if (!category) {
    return NextResponse.json({ error: "category requis" }, { status: 400 });
  }

  const alternatives = await prisma.alternative.findMany({
    where: { category, isActive: true },
    orderBy: { price: "asc" },
  });

  return NextResponse.json({ alternatives });
}
