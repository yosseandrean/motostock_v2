import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Detail Unit — Motostock",
};

export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

/**
 * The dedicated Detail Unit page was removed in ADR-0005. Old bookmarks bounce
 * straight to the edit form; a non-integer id is still a 404.
 */
export default async function UnitDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound();
  }

  redirect(`/units/${numericId}/edit`);
}
