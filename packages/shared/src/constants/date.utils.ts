/**
 * Calcola la differenza in anni interi tra due date.
 * Equivalente a date-fns differenceInYears, ma senza dipendenze esterne.
 */
export function differenceInYears(dateLeft: Date, dateRight: Date): number {
  let years = dateLeft.getFullYear() - dateRight.getFullYear();
  const monthDiff = dateLeft.getMonth() - dateRight.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && dateLeft.getDate() < dateRight.getDate())
  ) {
    years--;
  }
  return years;
}
