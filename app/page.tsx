import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { InventoryUnit } from "@/lib/unit";
import { InventoryList } from "@/app/inventory-list";
import { SiteNav } from "@/app/site-nav";

export const metadata: Metadata = {
  title: "Inventori — Motostock",
};

export const dynamic = "force-dynamic";

/**
 * Server component that fetches every Unit and passes serialized data to the
 * client list. Live search/status filtering happens in `InventoryList`, so this
 * page stays server-renderable with the full table in the initial HTML.
 */
export default async function InventoryPage() {
  const units = await prisma.unit.findMany({
    orderBy: { dateBought: "desc" },
  });

  const inventoryUnits: InventoryUnit[] = units.map((unit) => ({
    id: unit.id,
    brand: unit.brand,
    model: unit.model,
    modelYear: unit.modelYear,
    licensePlate: unit.licensePlate,
    chassisSerialNumber: unit.chassisSerialNumber,
    salesPerson: unit.salesPerson,
    buyPrice: unit.buyPrice,
    cost: unit.cost,
    sellPrice: unit.sellPrice,
    dateBoughtLabel: unit.dateBought.toLocaleDateString("id-ID"),
    dateSoldLabel: unit.dateSold?.toLocaleDateString("id-ID") ?? null,
  }));

  return (
    <>
      <SiteNav active="inventori" />
      <main className="inventory-shell inventory-shell--wide">
        <InventoryList units={inventoryUnits} />
      </main>
    </>
  );
}
