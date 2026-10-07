import type { ReactNode } from 'react';

export type TemplateType = 'minimal' | 'full' | 'custom';
export type OnboardingStep = 'template' | 'progress' | 'done';
export type OnboardingItem = { id: string; label: string; requiresEnvVar?: { vars: string[]; description?: string } };
export type OnboardingSummaryItem = string | { id: string; label: string; detail?: ReactNode };
export type OnboardingSection<T> = {
  id: number;
  type: string;
  label: string;
  getItems: (data: T) => OnboardingItem[];
};
export type OnboardingTemplate = { name: string; description: string; icon: ReactNode };
export type OnboardingOperation = { id: string; section: string; label: string; message: string };
export type OnboardingResult = { success: boolean; error?: string };

/** A vertical supplies data and authorized operations, never a replacement dialog. */
export type OnboardingDefinition<T> = {
  title: string;
  heading: string;
  icon: ReactNode;
  introduction: string;
  customIntroduction: string;
  completedIntroduction: string;
  completionMessage: string;
  completionLabel: string;
  storefrontHref: string;
  templates: Record<TemplateType, OnboardingTemplate>;
  sections: OnboardingSection<T>[];
  getTemplate: (template: Exclude<TemplateType, 'custom'>) => T;
  customBase: T;
  getCustomConfiguration?: (data: T) => unknown;
  customPrompt: string;
  customQuestions: string[];
  customDescription?: string;
  parseCustom: (input: unknown) => T;
  getOperations: (data: T) => OnboardingOperation[];
  getSummary: (data: T) => OnboardingSummaryItem[];
  start: () => Promise<OnboardingResult>;
  createItem: (data: T, operation: OnboardingOperation) => Promise<OnboardingResult>;
  verify: (data: T) => Promise<OnboardingResult>;
  complete: (data: T) => Promise<OnboardingResult>;
};
