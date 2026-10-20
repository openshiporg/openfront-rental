import {
  Bath, Bike, Car, Check, CookingPot, Dumbbell, Flame, Laptop, MountainSnow, PawPrint, Sailboat, Snowflake,
  Sunset, Tv, Utensils, WashingMachine, Waves, Wifi, type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  bath: Bath,
  bike: Bike,
  car: Car,
  'cooking-pot': CookingPot,
  dumbbell: Dumbbell,
  flame: Flame,
  laptop: Laptop,
  'mountain-snow': MountainSnow,
  'paw-print': PawPrint,
  sailboat: Sailboat,
  snowflake: Snowflake,
  sunset: Sunset,
  tv: Tv,
  utensils: Utensils,
  'washing-machine': WashingMachine,
  waves: Waves,
  wifi: Wifi,
};

/** Maps the host-chosen amenity icon key to an icon, falling back to a check. */
export function AmenityIcon({ iconKey, size = 18 }: { iconKey?: string | null; size?: number }) {
  const Icon = (iconKey && icons[iconKey]) || Check;
  return <Icon size={size} aria-hidden="true" strokeWidth={1.6} />;
}
