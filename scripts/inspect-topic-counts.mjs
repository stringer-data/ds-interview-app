#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const topics = await prisma.topic.findMany();
  console.log("Topics:", topics);

  for (const t of topics) {
    const count = await prisma.question.count({ where: { topicId: t.id, active: true } });
    console.log(`Topic ${t.name} (${t.slug}): ${count} active questions`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

