import * as Haptics from 'expo-haptics';

export const hapticFeedback = {
  // Tocco leggero: incremento/decremento peso e reps
  light: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignora se non supportato su emulatore web/non compatibile
    }
  },

  // Tocco medio: completamento/check di una serie
  medium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  // Tocco forte o notifica successo: scansione barcode riuscita o workout salvato
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  // Avviso o errore
  warning: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  },
};
