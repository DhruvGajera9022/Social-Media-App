-- CreateTable
CREATE TABLE "BlockList" (
    "id" SERIAL NOT NULL,
    "blockerId" INTEGER NOT NULL,
    "blockedId" INTEGER NOT NULL,

    CONSTRAINT "BlockList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockList_blockerId_blockedId_key" ON "BlockList"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "BlockList" ADD CONSTRAINT "BlockList_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockList" ADD CONSTRAINT "BlockList_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
