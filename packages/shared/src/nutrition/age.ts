/**
 * Calcola l'età esatta in anni solari corretta per giorno e mese.
 * @param birthDate Data di nascita (Date o stringa ISO)
 * @param referenceDate Data di riferimento (default: data corrente)
 */
export function calculateAge(birthDate: Date | string, referenceDate: Date = new Date()): number {
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) {
    throw new Error('Data di nascita non valida');
  }

  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

