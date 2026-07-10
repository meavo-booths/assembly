import { requireMeavoAccess } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";
import { createPartner } from "@/app/actions/partners";
import { ActionForm } from "@/components/action-form";
import { PartnerCard } from "@/components/partner-card";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  await requireMeavoAccess();

  const partners = await prisma.assemblyPartner.findMany({
    where: { isInternal: false },
    orderBy: { name: "asc" },
    include: { _count: { select: { assemblies: true } } },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3001";

  return (
    <>
      <PageHeader
        title="Partners"
        description="Manage assembly partners and the access codes for their portals."
      />

      <Card className="mb-6">
        <h2 className="font-medium text-slate-900">Add partner</h2>
        <ActionForm action={createPartner} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Name" name="name" required placeholder="Alliance" />
          <Input label="Partner email" name="email" type="email" placeholder="partner@example.com" />
          <Input label="Access code" name="code" required minLength={8} placeholder="Set a code (min 8 chars)" />
          <div className="flex items-end">
            <Button type="submit">Add partner</Button>
          </div>
        </ActionForm>
      </Card>

      <div className="grid gap-3">
        {partners.map((partner) => (
          <PartnerCard
            key={partner.id}
            baseUrl={baseUrl}
            partner={{
              id: partner.id,
              name: partner.name,
              slug: partner.slug,
              email: partner.email,
              codeHash: partner.codeHash,
              assemblyCount: partner._count.assemblies,
            }}
          />
        ))}
      </div>
    </>
  );
}
