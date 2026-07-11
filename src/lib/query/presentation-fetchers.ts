import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import type { AdaptationViewModel } from '@/core/presentation/adaptation-view-model';
import type { EffortViewModel } from '@/core/presentation/effort-view-model';
import type { RecoveryViewModel } from '@/core/presentation/recovery-view-model';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import type { SleepViewModel } from '@/core/presentation/sleep-view-model';
import type { BodyViewModel } from '@/core/presentation/body-view-model';
import type { PhysicalHealthViewModel } from '@/core/presentation/physical-health-view-model';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status}) sur ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchRecoveryPresentation(trainingDayId: string): Promise<RecoveryViewModel> {
  const { viewModel } = await fetchJson<{ viewModel: RecoveryViewModel }>(
    `/api/presentation/recovery?trainingDayId=${encodeURIComponent(trainingDayId)}`,
  );
  return viewModel;
}

export async function fetchSleepPresentation(trainingDayId: string): Promise<SleepViewModel> {
  const { viewModel } = await fetchJson<{ viewModel: SleepViewModel }>(
    `/api/presentation/sleep?trainingDayId=${encodeURIComponent(trainingDayId)}`,
  );
  return viewModel;
}

export async function fetchEffortPresentation(trainingDayId: string): Promise<EffortViewModel> {
  const { viewModel } = await fetchJson<{ viewModel: EffortViewModel }>(
    `/api/presentation/effort?trainingDayId=${encodeURIComponent(trainingDayId)}`,
  );
  return viewModel;
}

export async function fetchAdaptationPresentation(
  trainingDayId: string,
): Promise<AdaptationViewModel> {
  const { viewModel } = await fetchJson<{ viewModel: AdaptationViewModel }>(
    `/api/presentation/adaptation?trainingDayId=${encodeURIComponent(trainingDayId)}`,
  );
  return viewModel;
}

export async function fetchBodyPresentation(
  days: number | null | undefined,
): Promise<BodyViewModel> {
  const param = days == null ? 'all' : String(days);
  const url = `/api/presentation/body?days=${encodeURIComponent(param)}`;
  const { viewModel } = await fetchJson<{ viewModel: BodyViewModel }>(url);
  return viewModel;
}

export async function fetchPhysicalHealthPresentation(
  trainingDayId: string,
): Promise<PhysicalHealthViewModel> {
  const { viewModel } = await fetchJson<{ viewModel: PhysicalHealthViewModel }>(
    `/api/presentation/physical-health?trainingDayId=${encodeURIComponent(trainingDayId)}`,
  );
  return viewModel;
}

export async function fetchTodayPresentation(trainingDayId: string): Promise<TodayViewModel> {
  const { viewModel } = await fetchJson<{ viewModel: TodayViewModel }>(
    `/api/presentation/today?trainingDayId=${encodeURIComponent(trainingDayId)}`,
  );
  return viewModel;
}

export async function fetchPlannedSessionPresentation(
  sessionId: string,
): Promise<PlannedSessionViewModel> {
  const { viewModel } = await fetchJson<{ viewModel: PlannedSessionViewModel }>(
    `/api/presentation/planned-session/${encodeURIComponent(sessionId)}`,
  );
  return viewModel;
}

export async function fetchProjectedAthletePresentation(
  horizonDays: number,
  trainingDayId?: string,
): Promise<
  import('@/core/presentation/projected-athlete-view-model').ProjectedAthleteCardViewModel
> {
  const params = new URLSearchParams({ horizon: String(horizonDays) });
  if (trainingDayId) params.set('trainingDayId', trainingDayId);
  const { viewModel } = await fetchJson<{
    viewModel: import('@/core/presentation/projected-athlete-view-model').ProjectedAthleteCardViewModel;
  }>(`/api/presentation/projected-athlete?${params.toString()}`);
  return viewModel;
}

export async function fetchScenarioComparisonPresentation(
  horizonDays: number,
  trainingDayId?: string,
): Promise<
  import('@/core/presentation/scenario-comparison-view-model').ScenarioComparisonViewModel
> {
  const params = new URLSearchParams({ horizon: String(horizonDays) });
  if (trainingDayId) params.set('trainingDayId', trainingDayId);
  const { viewModel } = await fetchJson<{
    viewModel: import('@/core/presentation/scenario-comparison-view-model').ScenarioComparisonViewModel;
  }>(`/api/presentation/scenario-comparison?${params.toString()}`);
  return viewModel;
}
