#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const topics = await prisma.topic.findMany();
  console.log("Topics:", topics);

  const genAiTopic = topics.find((t) => t.slug === "gen-ai" || t.name === "Gen AI");
  console.log("Gen AI topic:", genAiTopic);

  const questions = await prisma.question.findMany({
    where: genAiTopic ? { topicId: genAiTopic.id } : {},
    include: { topic: true, theme: true },
    take: 5,
  });
  console.log("Sample questions:", JSON.stringify(questions, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

