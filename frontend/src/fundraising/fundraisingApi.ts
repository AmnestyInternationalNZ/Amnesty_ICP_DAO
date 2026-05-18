import type { FundraisingCampaignInput, FundraisingCampaignPayload } from '../backend';
import { CampaignVisibility } from '../backend';
import { routePaths } from '../routing/appRoutes';

export interface FundraisingDraft {
  title: string;
  shortDescription: string;
  story: string;
  fundsUse: string;
  impact: string;
  mediaUrl: string;
  creatorName: string;
  creatorContact: string;
  currency: string;
  goalAmount: string;
  deadlineLocal: string;
  visibility: CampaignVisibility;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const NANOS_PER_MS = 1_000_000n;
export const DEFAULT_FUNDRAISING_CURRENCY = 'NZD';
export const SUPPORTED_FUNDRAISING_CURRENCIES = [
  { code: 'NZD', label: 'New Zealand dollar' },
  { code: 'USD', label: 'US dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British pound' },
  { code: 'AUD', label: 'Australian dollar' },
  { code: 'CAD', label: 'Canadian dollar' },
  { code: 'JPY', label: 'Japanese yen' },
];

export function defaultCampaignDeadline(): string {
  const date = new Date(Date.now() + 30 * ONE_DAY_MS);
  date.setHours(17, 0, 0, 0);
  return toLocalDateTimeInput(date);
}

export function createEmptyFundraisingDraft(creatorName = ''): FundraisingDraft {
  return {
    title: '',
    shortDescription: '',
    story: '',
    fundsUse: '',
    impact: '',
    mediaUrl: '',
    creatorName,
    creatorContact: '',
    currency: DEFAULT_FUNDRAISING_CURRENCY,
    goalAmount: '15000',
    deadlineLocal: defaultCampaignDeadline(),
    visibility: CampaignVisibility.community,
  };
}

export function draftFromCampaign(campaign: FundraisingCampaignPayload): FundraisingDraft {
  return {
    title: campaign.title,
    shortDescription: campaign.shortDescription,
    story: campaign.story,
    fundsUse: campaign.fundsUse,
    impact: campaign.impact,
    mediaUrl: campaign.mediaUrl ?? '',
    creatorName: campaign.creatorName,
    creatorContact: campaign.creatorContact ?? '',
    currency: normalizeFundraisingCurrency(campaign.currency),
    goalAmount: campaign.goalAmount.toString(),
    deadlineLocal: toLocalDateTimeInput(new Date(Number(campaign.deadlineNs / NANOS_PER_MS))),
    visibility: campaign.visibility,
  };
}

export function inputFromDraft(draft: FundraisingDraft): FundraisingCampaignInput {
  return {
    title: draft.title.trim(),
    shortDescription: draft.shortDescription.trim(),
    story: draft.story.trim(),
    fundsUse: draft.fundsUse.trim(),
    impact: draft.impact.trim(),
    mediaUrl: normalizeOptionalText(draft.mediaUrl),
    creatorName: draft.creatorName.trim(),
    creatorContact: normalizeOptionalText(draft.creatorContact),
    currency: normalizeFundraisingCurrency(draft.currency),
    goalAmount: BigInt(Math.max(1, Math.floor(Number(draft.goalAmount) || 0))),
    deadlineNs: nanosFromLocalDateTime(draft.deadlineLocal),
    visibility: draft.visibility,
  };
}

export function validateDraftStep(draft: FundraisingDraft, step: number): string | null {
  if (step === 0) {
    if (!draft.title.trim()) return 'Add a campaign title before continuing.';
    if (!draft.shortDescription.trim()) return 'Add a short description for the campaign preview.';
    if (!draft.story.trim()) return 'Add the campaign story before continuing.';
  }
  if (step === 1) {
    const goal = Number(draft.goalAmount);
    if (!Number.isFinite(goal) || goal <= 0) return 'Set a positive fundraising goal.';
    if (!SUPPORTED_FUNDRAISING_CURRENCIES.some((currency) => currency.code === draft.currency)) {
      return 'Choose a supported fundraising currency.';
    }
    if (nanosFromLocalDateTime(draft.deadlineLocal) <= BigInt(Date.now()) * NANOS_PER_MS) {
      return 'Choose a future campaign deadline.';
    }
  }
  if (step === 2) {
    if (!draft.fundsUse.trim()) return 'Explain how the funds will be used.';
    if (!draft.impact.trim()) return 'Describe the impact supporters can create.';
  }
  if (step === 3 && draft.mediaUrl.trim() && !isLikelyMediaUrl(draft.mediaUrl)) {
    return 'Use a valid image or video URL for campaign media.';
  }
  if (step === 4 && !draft.creatorName.trim()) {
    return 'Add a creator display name.';
  }
  return null;
}

export function validateFullDraft(draft: FundraisingDraft): string | null {
  for (let index = 0; index < 5; index += 1) {
    const error = validateDraftStep(draft, index);
    if (error) return error;
  }
  return null;
}

export function progressPercent(campaign: Pick<FundraisingCampaignPayload, 'goalAmount' | 'totalRaised'>): number {
  if (campaign.goalAmount <= 0n) return 0;
  return Math.min(100, Math.round(Number((campaign.totalRaised * 100n) / campaign.goalAmount)));
}

export function daysLeft(deadlineNs: bigint): number {
  const deadlineMs = Number(deadlineNs / NANOS_PER_MS);
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / ONE_DAY_MS));
}

export function publicCampaignUrl(token: string): string {
  return `${window.location.origin}${routePaths.publicCampaign(token)}`;
}

export function createCampaignShareToken(): string {
  const bytes = new Uint8Array(24);
  window.crypto?.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function toLocalDateTimeInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function nanosFromLocalDateTime(value: string): bigint {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 0n;
  return BigInt(date.getTime()) * NANOS_PER_MS;
}

export function isLikelyMediaUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeFundraisingCurrency(value: string | null | undefined): string {
  const upper = (value ?? '').trim().toUpperCase();
  return SUPPORTED_FUNDRAISING_CURRENCIES.some((currency) => currency.code === upper)
    ? upper
    : DEFAULT_FUNDRAISING_CURRENCY;
}
