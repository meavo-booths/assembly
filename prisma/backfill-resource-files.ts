import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type LegacyResource = {
  id: string;
  storageKey: string;
  fileName: string | null;
  mimeType: string | null;
};

async function main() {
  const resources = await prisma.$queryRaw<LegacyResource[]>`
    SELECT id, "storageKey", "fileName", "mimeType"
    FROM "Resource"
    WHERE "storageKey" IS NOT NULL
  `;

  let created = 0;
  for (const resource of resources) {
    const existing = await prisma.resourceFile.count({ where: { resourceId: resource.id } });
    if (existing > 0) continue;

    await prisma.resourceFile.create({
      data: {
        resourceId: resource.id,
        storageKey: resource.storageKey,
        fileName: resource.fileName ?? "file.pdf",
        mimeType: resource.mimeType ?? "application/pdf",
      },
    });
    created++;
  }

  console.log(`Backfilled ${created} ResourceFile row(s) from ${resources.length} legacy resource(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
