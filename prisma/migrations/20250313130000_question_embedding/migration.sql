-- CreateTable
CREATE TABLE "QuestionEmbedding" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "model_version" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionEmbedding_question_id_key" ON "QuestionEmbedding"("question_id");

-- CreateIndex
CREATE INDEX "QuestionEmbedding_question_id_idx" ON "QuestionEmbedding"("question_id");

-- AddForeignKey
ALTER TABLE "QuestionEmbedding" ADD CONSTRAINT "QuestionEmbedding_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
