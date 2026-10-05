import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Sagoma geometrica stilizzata Unisex (linee guida sottili trasparenti)
 * per consentire all'atleta di posizionare testa, spalle, fianchi e piedi
 * alla giusta distanza e prospettiva nella prima foto di progresso (baseline).
 */
export const BaselineSilhouetteGuide: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT * 0.72}
        viewBox="0 0 400 700"
        fill="none"
      >
        {/* Testa */}
        <Circle
          cx="200"
          cy="75"
          r="42"
          stroke="rgba(16, 185, 129, 0.45)"
          strokeWidth="2.5"
          strokeDasharray="6,4"
        />

        {/* Collo */}
        <Path
          d="M 190 117 L 190 135 M 210 117 L 210 135"
          stroke="rgba(16, 185, 129, 0.45)"
          strokeWidth="2"
        />

        {/* Linea Orizzontale Spalle */}
        <Path
          d="M 120 155 L 280 155"
          stroke="rgba(16, 185, 129, 0.6)"
          strokeWidth="2"
          strokeDasharray="4,4"
        />

        {/* Torace e Busto */}
        <Path
          d="M 120 155 Q 140 250 150 330 L 250 330 Q 260 250 280 155 Z"
          stroke="rgba(16, 185, 129, 0.45)"
          strokeWidth="2.5"
          strokeDasharray="6,4"
        />

        {/* Linea Orizzontale Bacino / Fianchi */}
        <Path
          d="M 135 345 L 265 345"
          stroke="rgba(16, 185, 129, 0.6)"
          strokeWidth="2"
          strokeDasharray="4,4"
        />

        {/* Bacino */}
        <Path
          d="M 150 330 L 135 380 L 265 380 L 250 330"
          stroke="rgba(16, 185, 129, 0.4)"
          strokeWidth="2"
        />

        {/* Gamba Sinistra */}
        <Path
          d="M 160 380 L 155 510 L 150 640"
          stroke="rgba(16, 185, 129, 0.45)"
          strokeWidth="2.5"
          strokeDasharray="6,4"
        />

        {/* Gamba Destra */}
        <Path
          d="M 240 380 L 245 510 L 250 640"
          stroke="rgba(16, 185, 129, 0.45)"
          strokeWidth="2.5"
          strokeDasharray="6,4"
        />

        {/* Piedi / Base d'appoggio */}
        <Ellipse
          cx="150"
          cy="645"
          rx="18"
          ry="7"
          stroke="rgba(16, 185, 129, 0.5)"
          strokeWidth="2"
        />
        <Ellipse
          cx="250"
          cy="645"
          rx="18"
          ry="7"
          stroke="rgba(16, 185, 129, 0.5)"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
