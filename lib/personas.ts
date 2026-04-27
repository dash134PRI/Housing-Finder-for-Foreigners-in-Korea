import { Persona } from './types';

export const renterTypes = [
  {
    id: 'student',
    label: 'Student',
    subtitle: 'Lower deposit, simple move-in, student-friendly areas',
    maxDeposit: 5000000,
    maxRent: 650000,
    priorities: ['low deposit', 'student-friendly', 'foreign grocery nearby'],
  },
  {
    id: 'worker',
    label: 'Worker',
    subtitle: 'Commute, clean contract, practical daily access',
    maxDeposit: 10000000,
    maxRent: 950000,
    priorities: ['commute', 'contract clarity', 'clinic access'],
  },
  {
    id: 'remote',
    label: 'Remote worker',
    subtitle: 'Stable monthly cost, convenience, comfortable room size',
    maxDeposit: 7000000,
    maxRent: 760000,
    priorities: ['internet', 'daily convenience', 'clinic access'],
  },
] as const;

export const targetAreas = [
  {
    id: 'Sinchon',
    label: 'Sinchon',
    subtitle: 'Student-heavy, university area',
  },
  {
    id: 'Gangnam',
    label: 'Gangnam',
    subtitle: 'Business district, commute-focused',
  },
  {
    id: 'Hongdae',
    label: 'Hongdae',
    subtitle: 'Young, creative, remote-friendly',
  },
] as const;

export type RenterTypeId = (typeof renterTypes)[number]['id'];
export type TargetAreaId = (typeof targetAreas)[number]['id'];

export function createPersona(renterTypeId: RenterTypeId, targetArea: TargetAreaId): Persona {
  const renterType = renterTypes.find((item) => item.id === renterTypeId) ?? renterTypes[0];

  return {
    id: `${renterType.id}-${targetArea.toLowerCase()}`,
    label: `${renterType.label} near ${targetArea}`,
    subtitle: `${renterType.subtitle}. Showing ${targetArea} listings first.`,
    renterType: renterType.id,
    targetArea,
    maxDeposit: renterType.maxDeposit,
    maxRent: renterType.maxRent,
    priorities: [...renterType.priorities],
  };
}

export const personas: Persona[] = targetAreas.map((area) => createPersona('student', area.id));
