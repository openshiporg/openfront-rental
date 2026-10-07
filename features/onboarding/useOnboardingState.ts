'use client';

import { useRef, useState } from 'react';
import type { OnboardingDefinition, OnboardingStep, TemplateType } from './types';
import { runOnboarding as execute } from './runOnboarding';

export function useOnboardingState<T>(definition: OnboardingDefinition<T>) {
  const [step, setStep] = useState<OnboardingStep>('template');
  const [selectedTemplate, selectTemplate] = useState<TemplateType>('minimal');
  const [currentJsonData, setCurrentJsonData] = useState<T>(() => definition.getTemplate('minimal'));
  const [customDraft, setCustomDraft] = useState<T>();
  const [customJsonApplied, setCustomJsonApplied] = useState(false);
  const [progressMessage, setProgress] = useState('');
  const [loadingItems, setLoadingItems] = useState<Record<string, string[]>>({});
  const [completedItems, setCompletedItems] = useState<Record<string, string[]>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const running = useRef(false);

  const setSelectedTemplate = (template: TemplateType) => {
    if (running.current) return;
    selectTemplate(template);
    setCurrentJsonData(template === 'custom' ? customDraft ?? definition.customBase : definition.getTemplate(template));
    setCustomJsonApplied(false);
    setStep('template');
    setError(null);
    setLoadingItems({}); setCompletedItems({}); setItemErrors({});
  };
  const applyCustom = (data: T) => {
    setCustomDraft(data); setCurrentJsonData(data); setCustomJsonApplied(true); setError(null);
  };
  const runOnboarding = async () => {
    if (running.current || (selectedTemplate === 'custom' && !customJsonApplied)) return;
    running.current = true;
    setIsLoading(true); setError(null); setLoadingItems({}); setCompletedItems({}); setItemErrors({});
    setStep('progress'); setProgress('Starting onboarding…');
    try {
      const success = await execute(definition, currentJsonData, event => {
        if (event.type === 'message') { setProgress(event.message); return; }
        if (event.type === 'error') {
          setError(event.message);
          if (event.operation) {
            const { section, id } = event.operation;
            setLoadingItems(previous => ({ ...previous, [section]: [] }));
            setItemErrors(previous => ({ ...previous, [section]: { ...previous[section], [id]: event.message } }));
          }
          return;
        }
        const { section, id } = event.operation;
        setLoadingItems(previous => ({ ...previous, [section]: event.type === 'loading' ? [id] : [] }));
        if (event.type === 'completed') setCompletedItems(previous => ({ ...previous, [section]: [...(previous[section] || []), id] }));
      });
      if (success) setStep('done');
    } finally { running.current = false; setIsLoading(false); }
  };
  return { step, selectedTemplate, currentJsonData, customDraft, customJsonApplied, progressMessage, loadingItems, completedItems, itemErrors, error, isLoading, setSelectedTemplate, setCustomJsonApplied, applyCustom, runOnboarding };
}
