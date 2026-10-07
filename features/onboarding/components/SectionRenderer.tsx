import React from 'react';
import { Label } from '@/components/ui/label';
import { SectionItem } from './SectionItem';
import type { OnboardingSection } from '../types';

interface SectionRendererProps<T> {
  sections: OnboardingSection<T>[];
  selectedTemplate: 'full' | 'minimal' | 'custom';
  isLoading: boolean;
  loadingItems: Record<string, string[]>;
  completedItems: Record<string, string[]>;
  itemErrors: Record<string, Record<string, string>>;
  error: string | null;
  step: 'template' | 'progress' | 'done';
  currentJsonData: T;
}

export function SectionRenderer<T>({
  sections,
  selectedTemplate,
  isLoading,
  loadingItems,
  completedItems,
  itemErrors,
  error,
  step,
  currentJsonData,
}: SectionRendererProps<T>) {
  return (
    <div className="space-y-0">
      {sections.map((section, idx) => {
        const isLastItem = idx === sections.length - 1;
        const items = section.getItems(currentJsonData);

        return (
          <div key={section.type} className="relative">
            {/* Connecting line between sections */}
            {!isLastItem && (
              <div className="absolute left-3 top-3 bottom-0 w-[1px] bg-border"></div>
            )}

            {/* Section header with number badge */}
            <div className="flex items-center space-x-3 mb-2 relative">
              <div className="inline-flex size-6 items-center justify-center rounded-sm border border-border bg-background text-sm text-foreground shadow-sm z-10">
                {section.id}
              </div>
              <Label className="text-sm font-medium text-foreground">
                {section.label}
              </Label>
            </div>

            {/* Section items */}
            <div className="pl-9">
              <div className="flex flex-wrap gap-2 pb-6">
                {items.map(({ id, label, requiresEnvVar }) => {
                    // Determine the status of this item
                    let status: 'normal' | 'loading' | 'completed' | 'error' = 'normal';
                    let errorMessage: string | undefined;

                    // For completed step, all items are completed
                    if (step === 'done') {
                      status = 'completed';
                    } else {
                      // Check for errors first
                      if (error && itemErrors[section.type]?.[id]) {
                        status = 'error';
                        errorMessage = itemErrors[section.type][id];
                      }
                      // Then check if it's completed
                      else if (completedItems[section.type]?.includes(id)) {
                        status = 'completed';
                      }
                      // Then check if it's loading
                      else if (
                        isLoading &&
                        loadingItems[section.type]?.includes(id)
                      ) {
                        status = 'loading';
                      }
                    }

                    return (
                      <SectionItem
                        key={id}
                        item={label}
                        requiresEnvVar={requiresEnvVar}
                        sectionType={section.type}
                        status={status}
                        errorMessage={errorMessage}
                        step={step}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};