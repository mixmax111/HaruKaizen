-- CreateEnum
CREATE TYPE "RecordOrigin" AS ENUM ('USER', 'AI_DRAFT', 'AI_APPLIED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('BLOODWORK', 'MEDICAL_REPORT', 'COACH_PLAN', 'BIOMETRICS', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "firebase_uid" TEXT,
    "auth_provider" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "diet_tracking_mode" INTEGER NOT NULL DEFAULT 0,
    "lifestyle_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "height_cm" DOUBLE PRECISION,
    "birth_date" DATE,
    "sex" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "llm_api_key" TEXT,
    "preferred_llm_provider" TEXT DEFAULT 'gemini',
    "preferred_llm_model" TEXT DEFAULT 'gemini-2.5-flash',
    "custom_llm_base_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "locale" TEXT NOT NULL DEFAULT 'it-IT',
    "fcm_push_token" TEXT,
    "target_weight_kg" DOUBLE PRECISION,
    "coach_tone" TEXT NOT NULL DEFAULT 'KAIZEN',
    "is_dark_mode" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "body_fat_percentage" DOUBLE PRECISION,
    "chest_cm" DOUBLE PRECISION,
    "arms_cm" DOUBLE PRECISION,
    "waist_cm" DOUBLE PRECISION,
    "legs_cm" DOUBLE PRECISION,
    "recorded_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_media" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "progress_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insight_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "timeframe_code" TEXT NOT NULL,
    "date_start" DATE NOT NULL,
    "date_end" DATE NOT NULL,
    "context_snapshot" TEXT NOT NULL,
    "ai_response_markdown" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_insight_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "equipment" TEXT,
    "default_met_value" DOUBLE PRECISION NOT NULL,
    "created_by_user_id" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" "RecordOrigin" NOT NULL DEFAULT 'USER',
    "is_ai_isolated" BOOLEAN NOT NULL DEFAULT false,
    "ai_reasoning" TEXT,
    "clinical_warning" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_days" (
    "id" TEXT NOT NULL,
    "workout_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "workout_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_day_exercises" (
    "id" TEXT NOT NULL,
    "workout_day_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps_target" TEXT NOT NULL,
    "weight_target" TEXT,
    "rest_seconds" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "workout_day_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day_name_snapshot" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "calories_burned" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_log_exercises" (
    "id" TEXT NOT NULL,
    "workout_log_id" TEXT NOT NULL,
    "exercise_name_snapshot" TEXT NOT NULL,
    "is_skipped" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "workout_log_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_log_sets" (
    "id" TEXT NOT NULL,
    "workout_log_exercise_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "set_type" TEXT NOT NULL,
    "reps_completed" INTEGER,
    "weight_kg" DOUBLE PRECISION,
    "rpe" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "workout_log_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "calories_100g" DOUBLE PRECISION NOT NULL,
    "protein_100g" DOUBLE PRECISION NOT NULL,
    "carbs_100g" DOUBLE PRECISION NOT NULL,
    "fat_100g" DOUBLE PRECISION NOT NULL,
    "fiber_100g" DOUBLE PRECISION,
    "sodium_100g" DOUBLE PRECISION,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" "RecordOrigin" NOT NULL DEFAULT 'USER',
    "is_ai_isolated" BOOLEAN NOT NULL DEFAULT false,
    "ai_reasoning" TEXT,
    "clinical_warning" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "diet_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_days" (
    "id" TEXT NOT NULL,
    "diet_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "diet_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_day_items" (
    "id" TEXT NOT NULL,
    "diet_day_id" TEXT NOT NULL,
    "food_item_id" TEXT NOT NULL,
    "scheduled_time" TEXT,
    "meal_type" TEXT NOT NULL,
    "quantity_g" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "diet_day_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "food_item_id" TEXT,
    "logged_at" TIMESTAMP(3) NOT NULL,
    "meal_type" TEXT NOT NULL,
    "custom_food_name" TEXT,
    "quantity_g" DOUBLE PRECISION NOT NULL,
    "calories_consumed" DOUBLE PRECISION NOT NULL,
    "protein_consumed" DOUBLE PRECISION,
    "carbs_consumed" DOUBLE PRECISION,
    "fat_consumed" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "nutrition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "extracted_markdown" TEXT NOT NULL,
    "token_estimate" INTEGER NOT NULL DEFAULT 0,
    "is_active_in_rag" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "food_items_barcode_key" ON "food_items"("barcode");

-- CreateIndex
CREATE INDEX "user_documents_user_id_is_active_in_rag_idx" ON "user_documents"("user_id", "is_active_in_rag");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_media" ADD CONSTRAINT "progress_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insight_reports" ADD CONSTRAINT "ai_insight_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_workout_plan_id_fkey" FOREIGN KEY ("workout_plan_id") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_exercises" ADD CONSTRAINT "workout_day_exercises_workout_day_id_fkey" FOREIGN KEY ("workout_day_id") REFERENCES "workout_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_exercises" ADD CONSTRAINT "workout_day_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_log_exercises" ADD CONSTRAINT "workout_log_exercises_workout_log_id_fkey" FOREIGN KEY ("workout_log_id") REFERENCES "workout_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_log_sets" ADD CONSTRAINT "workout_log_sets_workout_log_exercise_id_fkey" FOREIGN KEY ("workout_log_exercise_id") REFERENCES "workout_log_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_days" ADD CONSTRAINT "diet_days_diet_plan_id_fkey" FOREIGN KEY ("diet_plan_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_day_items" ADD CONSTRAINT "diet_day_items_diet_day_id_fkey" FOREIGN KEY ("diet_day_id") REFERENCES "diet_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_day_items" ADD CONSTRAINT "diet_day_items_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
