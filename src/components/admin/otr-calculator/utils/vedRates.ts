export interface VEDBand {
  min: number;
  max: number;
  rate: number;
  label: string;
}

// UK VED rates for new cars (first year) 2024/25
// Based on CO2 emissions - these rates change annually
export const VED_BANDS: VEDBand[] = [
  { min: 0, max: 0, rate: 0, label: "A (0 g/km)" },
  { min: 1, max: 50, rate: 10, label: "B (1-50 g/km)" },
  { min: 51, max: 75, rate: 30, label: "C (51-75 g/km)" },
  { min: 76, max: 90, rate: 135, label: "D (76-90 g/km)" },
  { min: 91, max: 100, rate: 175, label: "E (91-100 g/km)" },
  { min: 101, max: 110, rate: 195, label: "F (101-110 g/km)" },
  { min: 111, max: 130, rate: 220, label: "G (111-130 g/km)" },
  { min: 131, max: 150, rate: 270, label: "H (131-150 g/km)" },
  { min: 151, max: 170, rate: 680, label: "I (151-170 g/km)" },
  { min: 171, max: 190, rate: 1095, label: "J (171-190 g/km)" },
  { min: 191, max: 225, rate: 1650, label: "K (191-225 g/km)" },
  { min: 226, max: 255, rate: 2340, label: "L (226-255 g/km)" },
  { min: 256, max: 99999, rate: 2745, label: "M (Over 255 g/km)" },
];

export const FIRST_REG_FEE = 55;

export function getVEDFromCO2(co2: number): { rate: number; band: VEDBand | null } {
  if (co2 < 0) {
    return { rate: 0, band: null };
  }

  const band = VED_BANDS.find((b) => co2 >= b.min && co2 <= b.max);
  
  if (!band) {
    // Default to highest band if somehow out of range
    const highestBand = VED_BANDS[VED_BANDS.length - 1];
    return { rate: highestBand.rate, band: highestBand };
  }

  return { rate: band.rate, band };
}
