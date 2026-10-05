import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api';

export interface NutritionSummary {
  totalCalories: number;
  calorieTarget: number;
  totalProtein: number;
  proteinTarget: number;
  totalCarbs: number;
  carbsTarget: number;
  totalFat: number;
  fatTarget: number;
}

export interface BodyMeasurement {
  id: string;
  weightKg: number;
  date: string;
  bodyFatPercentage?: number;
}

export interface WorkoutLogSession {
  id: string;
  name?: string;
  isPR?: boolean;
  durationMinutes?: number;
  caloriesBurned?: number;
  totalSets?: number;
  topSetDescription?: string;
  notes?: string;
  completedAt?: string;
}

export interface AiInsight {
  id: string;
  title: string;
  message?: string;
  summary?: string;
  prescription?: string;
  score?: number;
  category?: string;
  actionableRecommendation?: string;
  createdAt?: string;
}

export function useTelemetryNutrition(date?: string) {
  const queryDate = date || new Date().toISOString().split('T')[0];
  return useQuery<NutritionSummary>({
    queryKey: ['telemetry', 'nutrition', queryDate],
    queryFn: async () => {
      const res = await apiClient.get(`/nutrition/summary`, {
        params: { date: queryDate },
      });
      return res.data?.data || res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useTelemetryMeasurements() {
  return useQuery<BodyMeasurement[]>({
    queryKey: ['telemetry', 'measurements'],
    queryFn: async () => {
      const res = await apiClient.get('/measurements');
      return res.data?.data || res.data || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useTelemetryWorkouts() {
  return useQuery<WorkoutLogSession[]>({
    queryKey: ['telemetry', 'workouts'],
    queryFn: async () => {
      const res = await apiClient.get('/workout/logs');
      return res.data?.data || res.data || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useTelemetryAiInsights() {
  return useQuery<AiInsight[]>({
    queryKey: ['telemetry', 'ai-insights'],
    queryFn: async () => {
      const res = await apiClient.get('/ai/insights');
      return res.data?.data || res.data || [];
    },
    staleTime: 60 * 1000,
  });
}
