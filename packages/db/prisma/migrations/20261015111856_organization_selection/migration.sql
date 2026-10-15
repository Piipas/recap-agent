-- AlterTable
ALTER TABLE "recap_run" ADD COLUMN     "orgRepos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "orgs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "schedule" ADD COLUMN     "orgRepos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "orgs" TEXT[] DEFAULT ARRAY[]::TEXT[];
