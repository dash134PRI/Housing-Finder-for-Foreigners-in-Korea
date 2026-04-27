import { Persona } from './types';

export const personas: Persona[] = [
  {
    id: 'student-sinchon',
    label: '🎓 International Student near Sinchon',
    subtitle: 'Low deposit, student area, beginner Korean support',
    targetArea: 'Sinchon',
    maxDeposit: 5000000,
    maxRent: 650000,
    priorities: ['low deposit', 'student-friendly', 'foreign grocery nearby'],
  },
  {
    id: 'worker-gangnam',
    label: '💼 Worker near Gangnam',
    subtitle: 'Commute, contract clarity, parking option',
    targetArea: 'Gangnam',
    maxDeposit: 10000000,
    maxRent: 950000,
    priorities: ['commute', 'contract clarity', 'parking'],
  },
  {
    id: 'remote-hongdae',
    label: '💻 Remote Worker near Hongdae',
    subtitle: 'Internet, expat-friendly area, daily convenience',
    targetArea: 'Hongdae',
    maxDeposit: 7000000,
    maxRent: 760000,
    priorities: ['internet', 'foreign grocery nearby', 'clinic access'],
  },
];
