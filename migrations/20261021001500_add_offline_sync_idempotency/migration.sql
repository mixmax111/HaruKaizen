-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "client_side_id" TEXT;

-- AlterTable
ALTER TABLE "nutrition_logs" ADD COLUMN     "client_side_id" TEXT;

-- AlterTable
ALTER TABLE "user_documents" ADD COLUMN     "client_side_id" TEXT;

-- AlterTable
ALTER TABLE "workout_log_sets" ADD COLUMN     "client_side_id" TEXT;

-- AlterTable
ALTER TABLE "workout_logs" ADD COLUMN     "client_side_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "measurements_client_side_id_key" ON "measurements"("client_side_id");

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_logs_client_side_id_key" ON "nutrition_logs"("client_side_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_documents_client_side_id_key" ON "user_documents"("client_side_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_log_sets_client_side_id_key" ON "workout_log_sets"("client_side_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_logs_client_side_id_key" ON "workout_logs"("client_side_id");

