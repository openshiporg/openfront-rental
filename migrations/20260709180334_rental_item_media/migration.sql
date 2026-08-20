-- CreateTable
CREATE TABLE "RentalItemImage" (
    "id" TEXT NOT NULL,
    "image_id" TEXT,
    "image_filesize" INTEGER,
    "image_width" INTEGER,
    "image_height" INTEGER,
    "image_extension" TEXT,
    "imagePath" TEXT NOT NULL DEFAULT '',
    "altText" TEXT NOT NULL DEFAULT '',
    "order" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalItemImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RentalItem_images" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalItemImage_imagePath_key" ON "RentalItemImage"("imagePath");

-- CreateIndex
CREATE UNIQUE INDEX "_RentalItem_images_AB_unique" ON "_RentalItem_images"("A", "B");

-- CreateIndex
CREATE INDEX "_RentalItem_images_B_index" ON "_RentalItem_images"("B");

-- AddForeignKey
ALTER TABLE "_RentalItem_images" ADD CONSTRAINT "_RentalItem_images_A_fkey" FOREIGN KEY ("A") REFERENCES "RentalItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RentalItem_images" ADD CONSTRAINT "_RentalItem_images_B_fkey" FOREIGN KEY ("B") REFERENCES "RentalItemImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
