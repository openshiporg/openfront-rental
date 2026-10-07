import { Building2, CircleCheck, House } from 'lucide-react';
import { rentalSectionLabels } from '../lib/rentalOnboardingPlan';

export type AccommodationTemplateType = 'full' | 'minimal' | 'custom';
export type AccommodationSectionType =
  | 'business'
  | 'properties'
  | 'accommodations'
  | 'amenities'
  | 'policies'
  | 'rates'
  | 'availability'
  | 'workflows';

export interface AccommodationTemplate {
  name: string;
  description: string;
  icon: React.ReactNode;
}

export const ACCOMMODATION_TEMPLATES: Record<AccommodationTemplateType, AccommodationTemplate> = {
  minimal: {
    name: 'Basic Setup',
    description: 'One hosted home with the essentials for direct discovery and booking.',
    icon: <House className="h-5 w-5" />,
  },
  full: {
    name: 'Complete Setup',
    description: 'A representative portfolio with rates, availability, stays, and host operations.',
    icon: <Building2 className="h-5 w-5" />,
  },
  custom: {
    name: 'Custom Setup',
    description: 'Customize the accommodation portfolio with your own validated JSON configuration.',
    icon: <CircleCheck className="h-5 w-5" />,
  },
};

export interface SectionDefinition {
  id: number;
  type: AccommodationSectionType;
  label: string;
}

export const SECTION_DEFINITIONS: SectionDefinition[] = rentalSectionLabels.map(([type, label], index) => ({ id: index + 1, type, label }));
