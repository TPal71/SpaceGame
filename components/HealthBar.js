// components/HealthBar.js
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const DEFAULT_BAR_MAX_WIDTH = 100; // A csík maximális szélessége
const DEFAULT_BAR_HEIGHT = 12;     // A csík magassága

const HealthBar = ({ 
  currentHealth, 
  maxHealth, 
  width = DEFAULT_BAR_MAX_WIDTH, 
  height = DEFAULT_BAR_HEIGHT 
}) => {
  const healthPercentage = Math.max(0, Math.min(1, currentHealth / maxHealth));
  const barCurrentWidth = width * healthPercentage;

  // Színkalkuláció: Zöld (100%) -> Sárga (50%) -> Piros (0%)
  // Ez egy egyszerűbb RGB interpoláció, ami zöldből pirosba megy át a sárgán keresztül.
  let r, g;
  if (healthPercentage > 0.5) {
    // Zöldből sárgába (csökken a zöld komponens piros felé)
    r = Math.floor(255 * (1 - healthPercentage) * 2);
    g = 255;
  } else {
    // Sárgából pirosba (csökken a zöld komponens, a piros marad max)
    r = 255;
    g = Math.floor(255 * healthPercentage * 2);
  }
  
  // Biztosítjuk, hogy az RGB értékek 0 és 255 között maradjanak
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));

  const barColor = `rgb(${r}, ${g}, 0)`;

  return (
    <View style={[styles.container, { width, height, borderRadius: height / 2 }]}>
      <View 
        style={[
          styles.health, 
          { 
            width: barCurrentWidth, 
            backgroundColor: barColor,
            borderRadius: height / 2, // Hogy a belső csík is lekerekített legyen
          }
        ]} 
      />
      {/* Opcionálisan megjeleníthetjük a számértéket a csíkon vagy mellette */}
      {/* <Text style={styles.healthText}>{currentHealth}/{maxHealth}</Text> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333', // A háttérszíne a csíknak
    borderWidth: 1,
    borderColor: '#222',
    justifyContent: 'center', // Szöveg középre igazításához, ha lenne
  },
  health: {
    height: '100%',
  },
  // healthText: { // Ha szeretnéd a számot is kiírni
  //   position: 'absolute',
  //   width: '100%',
  //   textAlign: 'center',
  //   fontSize: 10,
  //   color: 'white',
  //   fontWeight: 'bold',
  // },
});

export default HealthBar;
