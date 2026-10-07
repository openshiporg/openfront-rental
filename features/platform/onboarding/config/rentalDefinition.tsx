'use client';

import { GraphQLClient } from 'graphql-request';
import { HousePlus } from 'lucide-react';
import type { OnboardingDefinition } from '@/features/onboarding/types';
import { ACCOMMODATION_TEMPLATES } from './templates';
import { getCustomSetupConfiguration, getSeedForTemplate, type AccommodationSeed } from '../utils/dataUtils';
import { rentalOnboardingPlan, rentalSectionLabels, validateRentalOnboardingSeed } from '../lib/rentalOnboardingPlan';
import { startOnboarding, completeOnboarding } from '../actions/onboarding';

function inputFor(data: AccommodationSeed): import('@/features/keystone/onboarding/rentalOnboarding').RentalOnboardingInput {
  return data.onboardingTemplate === 'minimal' || data.onboardingTemplate === 'full'
    ? { template: data.onboardingTemplate }
    : { template: 'custom', customConfiguration: getCustomSetupConfiguration(data) };
}

async function command(data: AccommodationSeed, mode: 'create' | 'verify' | 'complete', operationId?: string) {
  const client = new GraphQLClient('/api/graphql');
  const result = await client.request<{ rentalOnboarding: { success: boolean; error?: string } }>(
    `mutation RentalOnboarding($input: JSON!, $mode: String!, $operationId: String) {
      rentalOnboarding(input: $input, mode: $mode, operationId: $operationId)
    }`, { input: inputFor(data), mode, operationId },
  );
  return result.rentalOnboarding;
}

/** The only rental-specific UI configuration. Layout and progress belong to the shared component. */
export function rentalDefinition(): OnboardingDefinition<AccommodationSeed> {
  return {
    title: 'Onboarding', heading: 'Rental Setup', icon: <HousePlus className="size-5 text-foreground" aria-hidden="true" />,
    introduction: 'Configure your rental business', customIntroduction: 'Copy JSON templates for custom setup',
    completedIntroduction: 'Your rental setup is complete',
    completionMessage: 'Your rental configuration and sample workflows are saved. Review sample stays, verify payments and calendar connections, and test a first booking before opening sales.',
    completionLabel: 'Rental setup complete', storefrontHref: '/',
    templates: ACCOMMODATION_TEMPLATES,
    sections: rentalSectionLabels.map(([type, label], index) => ({ id: index + 1, type, label, getItems: data => rentalOnboardingPlan(data).filter(item => item.section === type) })),
    getTemplate: template => getSeedForTemplate(template),
    customBase: getSeedForTemplate('full'),
    getCustomConfiguration: getCustomSetupConfiguration,
    customDescription: 'Follow these steps to create a personalized rental setup using AI assistance.',
    customPrompt: 'Help me customize this rental business configuration. First explain the business, homes, amenities, policies, rates, fees and calendars. Ask what I want to change. Keep identities stable for retained records and use new unique identities when adding homes. You may remove or reorder homes and edit supported fields. Do not invent payment captures or channel capabilities. When I am finished, return the complete valid JSON configuration. Operational examples are supplied by the server, not executed transactions.',
    customQuestions: ['What homes and accommodation types do you offer?', 'What amenities and house rules apply?', 'What rates, fees, deposits, and stay limits do you need?', 'What business and host information should guests see?'],
    parseCustom: value => { const seed = getSeedForTemplate('custom', value); validateRentalOnboardingSeed(seed); return seed; },
    getOperations: data => { validateRentalOnboardingSeed(data); return rentalOnboardingPlan(data); },
    getSummary: data => [
      `${data.properties.length} ${data.properties.length === 1 ? 'property' : 'properties'} configured`,
      `${data.properties.length} listing${data.properties.length === 1 ? '' : 's'} configured`,
      `${data.amenities.length} ${data.amenities.length === 1 ? 'amenity' : 'amenities'} configured`,
      `${data.reservations.length} sample stay workflow${data.reservations.length === 1 ? '' : 's'} configured`,
    ],
    start: startOnboarding,
    createItem: (data, operation) => command(data, 'create', operation.id),
    verify: data => command(data, 'verify'),
    complete: data => completeOnboarding(inputFor(data)),
  };
}
