import {
  AirVent,
  Car,
  CookingPot,
  Dog,
  Dumbbell,
  Flame,
  Flower2,
  Mountain,
  Plug,
  Shirt,
  Snowflake,
  Tv,
  Umbrella,
  Waves,
  Wheat,
  Wifi,
  Wind,
  type LucideIcon,
  Accessibility,
  ArrowUpFromDot,
} from 'lucide-react';

const AMENITY_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  wifi: { icon: Wifi, label: 'High-speed WiFi' },
  pool: { icon: Waves, label: 'Pool' },
  'hot-tub': { icon: Waves, label: 'Hot Tub' },
  kitchen: { icon: CookingPot, label: 'Kitchen' },
  parking: { icon: Car, label: 'Free Parking' },
  gym: { icon: Dumbbell, label: 'Gym' },
  'air-conditioning': { icon: AirVent, label: 'Air Conditioning' },
  heating: { icon: Flame, label: 'Heating' },
  washer: { icon: Shirt, label: 'Washer' },
  dryer: { icon: Wind, label: 'Dryer' },
  tv: { icon: Tv, label: 'TV' },
  fireplace: { icon: Flame, label: 'Fireplace' },
  balcony: { icon: Mountain, label: 'Balcony' },
  garden: { icon: Flower2, label: 'Garden' },
  'beach-access': { icon: Umbrella, label: 'Beach Access' },
  'ski-in-out': { icon: Snowflake, label: 'Ski-in/Ski-out' },
  'ev-charger': { icon: Plug, label: 'EV Charger' },
  'pet-friendly': { icon: Dog, label: 'Pet Friendly' },
  'wheelchair-accessible': { icon: Accessibility, label: 'Wheelchair Accessible' },
  elevator: { icon: ArrowUpFromDot, label: 'Elevator' },
};

interface AmenitiesGridProps {
  amenities: string[];
}

export function AmenitiesGrid({ amenities }: AmenitiesGridProps) {
  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-4 sm:grid-cols-2">
      {amenities.map((key) => {
        const config = AMENITY_CONFIG[key];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <div key={key} className="flex items-center gap-4 py-2">
            <Icon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-900 dark:text-slate-50">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
