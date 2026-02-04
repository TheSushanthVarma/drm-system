-- Create catalogues table
CREATE TABLE IF NOT EXISTS "catalogues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogues_pkey" PRIMARY KEY ("id")
);

-- Add catalogueId column to requests table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requests' AND column_name = 'catalogueId'
    ) THEN
        ALTER TABLE "requests" ADD COLUMN "catalogueId" TEXT;
    END IF;
END $$;

-- Add foreign key constraint for catalogues.createdById
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'catalogues_createdById_fkey'
    ) THEN
        ALTER TABLE "catalogues" ADD CONSTRAINT "catalogues_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for requests.catalogueId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'requests_catalogueId_fkey'
    ) THEN
        ALTER TABLE "requests" ADD CONSTRAINT "requests_catalogueId_fkey" 
        FOREIGN KEY ("catalogueId") REFERENCES "catalogues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
