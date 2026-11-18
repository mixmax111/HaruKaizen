-- AlterTable
ALTER TABLE "workout_logs" ADD COLUMN     "calorie_model_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "gross_calories_burned" DOUBLE PRECISION;
