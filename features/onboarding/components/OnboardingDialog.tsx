'use client';

import React from 'react';
import {
  AlertCircle,
  Loader2,
  CircleCheck,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge-button';
import { CustomSetupSteps } from './CustomSetupSteps';
import { SectionRenderer } from './SectionRenderer';
import { useOnboardingState } from '../useOnboardingState';
import type { OnboardingDefinition } from '../types';


interface OnboardingDialogProps<T> {
  isOpen: boolean;
  onClose: () => void;
  definition: OnboardingDefinition<T>;
}

export function OnboardingDialog<T>({ isOpen, onClose, definition }: OnboardingDialogProps<T>) {
  const {
    step, selectedTemplate, currentJsonData, customDraft, customJsonApplied,
    progressMessage, loadingItems, completedItems, error, itemErrors, isLoading,
    setSelectedTemplate, setCustomJsonApplied, applyCustom, runOnboarding,
  } = useOnboardingState(definition);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-[95vw] flex-col overflow-hidden p-0 gap-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-4 sm:px-6 py-4 mb-0 shrink-0">
          <DialogTitle>{definition.title}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Mobile-first layout: Store Setup header and Setup Type appear first */}
          <div className="order-1 flex shrink-0 flex-col lg:order-none lg:w-80 lg:justify-between lg:border-r">
            <div className="flex-1">
              <div className="p-4 sm:p-6">
                {/* Store Setup Header - Always visible first on mobile */}
                <div className="flex items-center space-x-3">
                  <div className="inline-flex shrink-0 items-center justify-center rounded-sm bg-muted p-3">
                    {definition.icon}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium text-foreground">
                      {definition.heading}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {step === 'done'
                        ? definition.completedIntroduction
                        : selectedTemplate === 'custom'
                        ? definition.customIntroduction
                        : definition.introduction}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />

                {step === 'done' ? (
                  <>
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      Setup Complete
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {definition.completionMessage}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-emerald-600 dark:text-emerald-500 mb-4">
                      <CircleCheck className="h-4 w-4 fill-emerald-500 text-background" />
                      <span>{definition.completionLabel}</span>
                    </div>

                    <div className="space-y-3 text-sm">
                      {definition.getSummary(currentJsonData).map(line => (
                        <div key={typeof line === 'string' ? line : line.id} className="flex items-center space-x-2 text-muted-foreground">
                          <CircleCheck className="h-4 w-4 fill-muted-foreground text-background" />
                          <span className="font-medium">{typeof line === 'string' ? line : line.label}</span>
                          {typeof line === 'string' ? null : line.detail}
                        </div>
                      ))}
                    </div>
                  </>
                ) : !isLoading ? (
                  <>
                    <h4 className="text-sm font-medium text-foreground mb-4">
                      Setup Type
                    </h4>

                    {/* Mobile: Dropdown selector */}
                    <div className="block lg:hidden">
                      <Select
                        value={selectedTemplate}
                        onValueChange={(value) => setSelectedTemplate(value as 'minimal' | 'full' | 'custom')}
                      >
                        <SelectTrigger className="w-full h-auto py-3">
                          <SelectValue>{definition.templates[selectedTemplate].name}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-content-available-width)]">
                          <SelectItem value="minimal">
                            <div className="flex flex-col items-start text-left">
                              <span className="font-medium">{definition.templates.minimal.name}</span>
                              <span className="text-xs text-muted-foreground">{definition.templates.minimal.description}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="full">
                            <div className="flex flex-col items-start text-left">
                              <span className="font-medium">{definition.templates.full.name}</span>
                              <span className="text-xs text-muted-foreground">{definition.templates.full.description}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="custom">
                            <div className="flex flex-col items-start text-left">
                              <span className="font-medium">{definition.templates.custom.name}</span>
                              <span className="text-xs text-muted-foreground">{definition.templates.custom.description}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Desktop: Radio Group */}
                    <div className="hidden lg:block">
                      <RadioGroup
                        value={selectedTemplate}
                        onValueChange={(value) =>
                          setSelectedTemplate(value as 'minimal' | 'full' | 'custom')
                        }
                        className="space-y-4"
                      >
                        <div
                          className={`border p-4 rounded-md transition-colors cursor-pointer ${
                            selectedTemplate === 'minimal'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:border-blue-200'
                          }`}
                          onClick={() => setSelectedTemplate('minimal')}
                        >
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 mt-[3px]">
                              <span className={selectedTemplate === 'minimal' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}>{definition.templates.minimal.icon}</span>
                            </div>
                            <div className="flex-1">
                              <RadioGroupItem
                                value="minimal"
                                id="minimal"
                                className="sr-only"
                              />
                              <Label
                                htmlFor="minimal"
                                className="flex-1 cursor-pointer"
                              >
                                <div className="font-medium text-base mb-1">
                                  {definition.templates.minimal.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {definition.templates.minimal.description}
                                </div>
                              </Label>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`border p-4 rounded-md transition-colors cursor-pointer ${
                            selectedTemplate === 'full'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:border-blue-200'
                          }`}
                          onClick={() => setSelectedTemplate('full')}
                        >
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 mt-[3px]">
                              <span className={selectedTemplate === 'full' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}>{definition.templates.full.icon}</span>
                            </div>
                            <div className="flex-1">
                              <RadioGroupItem
                                value="full"
                                id="full"
                                className="sr-only"
                              />
                              <Label
                                htmlFor="full"
                                className="flex-1 cursor-pointer"
                              >
                                <div className="font-medium text-base mb-1">
                                  {definition.templates.full.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {definition.templates.full.description}
                                </div>
                              </Label>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`border p-4 rounded-md transition-colors cursor-pointer ${
                            selectedTemplate === 'custom'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:border-blue-200'
                          }`}
                          onClick={() => setSelectedTemplate('custom')}
                        >
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 mt-[3px]">
                              <span className={selectedTemplate === 'custom' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}>{definition.templates.custom.icon}</span>
                            </div>
                            <div className="flex-1">
                              <RadioGroupItem
                                value="custom"
                                id="custom"
                                className="sr-only"
                              />
                              <Label
                                htmlFor="custom"
                                className="flex-1 cursor-pointer"
                              >
                                <div className="font-medium text-base mb-1">
                                  {definition.templates.custom.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {definition.templates.custom.description}
                                </div>
                              </Label>
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-medium text-foreground">
                      {`Creating ${definition.templates[selectedTemplate].name}`}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {progressMessage}
                    </p>
                  </>
                )}
              </div>
            </div>
            {/* Desktop buttons - hidden on mobile */}
            <div className="hidden lg:flex flex-col border-t mt-auto">
              {/* Error message above buttons */}
              {error && !isLoading && step !== 'done' && (
                <Badge
                  color="rose"
                  className="rounded-none gap-3 text-sm border-b"
                >
                  <AlertCircle className="size-4 sm:size-7" />
                  <span className="text-xs sm:text-sm">
                    {error} Successful records will be reused when you retry.
                  </span>
                </Badge>
              )}

              {/* Desktop Buttons */}
              <div className="flex items-center justify-between p-4">
                {step === 'done' ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className="w-full sm:w-auto">
                        Close
                      </Button>
                    </DialogClose>
                    <Button asChild className="w-full sm:w-auto">
                      <a href={definition.storefrontHref} target="_blank" rel="noopener noreferrer">
                        View your storefront
                        <ArrowUpRight className="ml-1.5 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    {isLoading ? (
                      <Button disabled className="w-full sm:w-auto">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </Button>
                    ) : (
                      <Button disabled={selectedTemplate === 'custom' && !customJsonApplied} onClick={runOnboarding} className="w-full sm:w-auto">
                        Confirm
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="order-2 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:order-none">
            {selectedTemplate === 'custom' && step === 'template' && !customJsonApplied ? (
              /* Custom Setup Steps */
              <CustomSetupSteps
                definition={definition}
                currentJson={customDraft}
                onJsonUpdate={(newJsonData) => {
                  applyCustom(newJsonData);
                }}
                onBack={() => setCustomJsonApplied(false)}
              />
            ) : (
              /* Unified Section Renderer Component */
              <>
              {selectedTemplate === 'custom' && step === 'template' && (
                <Button variant="ghost" size="sm" className="mb-4" onClick={() => setCustomJsonApplied(false)}>Back to Custom Setup</Button>
              )}
              <SectionRenderer
                sections={definition.sections}
                selectedTemplate={selectedTemplate}
                isLoading={isLoading}
                loadingItems={loadingItems}
                completedItems={completedItems}
                itemErrors={itemErrors}
                error={error}
                step={step}
                currentJsonData={currentJsonData}
              />
              </>
            )}
          </div>
        </div>

        {/* Mobile buttons - attached to bottom */}
        <div className="flex shrink-0 flex-col border-t lg:hidden">
          {/* Mobile Error message above buttons */}
          {error && !isLoading && step !== 'done' && (
            <Badge
              color="rose"
              className="rounded-none gap-3 text-sm border-b"
            >
              <AlertCircle className="size-4 sm:size-7" />
              <span className="text-xs sm:text-sm">
                {error} Successful records will be reused when you retry.
              </span>
            </Badge>
          )}

          {/* Mobile Buttons */}
          <div className="flex items-center justify-between p-4">
            {step === 'done' ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    Close
                  </Button>
                </DialogClose>
                <Button asChild className="flex-1">
                  <a href={definition.storefrontHref} target="_blank" rel="noopener noreferrer">
                    View your storefront
                    <ArrowUpRight className="ml-1.5 h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                {isLoading ? (
                  <Button disabled className="flex-1">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </Button>
                ) : (
                  <Button disabled={selectedTemplate === 'custom' && !customJsonApplied} onClick={runOnboarding} className="flex-1">
                    Confirm
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
