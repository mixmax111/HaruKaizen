import { Prisma } from '@prisma/client';

export type WorkoutPlanWithRelations = Prisma.WorkoutPlanGetPayload<{
  include: {
    workoutDays: {
      include: {
        exercises: {
          include: {
            exercise: true;
          };
        };
      };
    };
  };
}>;

export interface PublicExerciseDto {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  defaultMetValue: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicWorkoutDayExerciseDto {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  orderIndex: number;
  sets: number;
  repsTarget: string;
  restSeconds: number;
  exercise: PublicExerciseDto;
}

export interface PublicWorkoutDayDto {
  id: string;
  workoutPlanId: string;
  name: string;
  orderIndex: number;
  dayOrder: number | null;
  exercises: PublicWorkoutDayExerciseDto[];
}

export interface PublicWorkoutPlanDto {
  id: string;
  name: string;
  origin: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  workoutDays: PublicWorkoutDayDto[];
}

/**
 * Whitelist mapper fortemente tipizzato per schede di allenamento pubbliche.
 * Esclude tassativamente dati sensibili dell'autore:
 * userId, aiReasoning, clinicalWarning, isActive, notes, weightTarget, weightTargetKg, rpeTarget, createdByUserId.
 */
export function mapPublicWorkoutPlan(plan: WorkoutPlanWithRelations): PublicWorkoutPlanDto {
  return {
    id: plan.id,
    name: plan.name,
    origin: plan.origin,
    isPublic: plan.isPublic,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    workoutDays: (plan.workoutDays || []).map((day) => ({
      id: day.id,
      workoutPlanId: day.workoutPlanId,
      name: day.name,
      orderIndex: day.orderIndex,
      dayOrder: day.dayOrder,
      exercises: (day.exercises || []).map((dayEx) => ({
        id: dayEx.id,
        workoutDayId: dayEx.workoutDayId,
        exerciseId: dayEx.exerciseId,
        orderIndex: dayEx.orderIndex,
        sets: dayEx.sets,
        repsTarget: dayEx.repsTarget,
        restSeconds: dayEx.restSeconds,
        exercise: {
          id: dayEx.exercise.id,
          name: dayEx.exercise.name,
          category: dayEx.exercise.category,
          equipment: dayEx.exercise.equipment,
          defaultMetValue: dayEx.exercise.defaultMetValue,
          isVerified: dayEx.exercise.isVerified,
          createdAt: dayEx.exercise.createdAt,
          updatedAt: dayEx.exercise.updatedAt,
        },
      })),
    })),
  };
}
