import React from 'react';
import { View, StyleSheet } from 'react-native';

const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;

const Enemy = ({ x, y }) => {
  return <View style={[styles.enemy, { left: x, top: y }]} />;
};

const styles = StyleSheet.create({
  enemy: {
    position: 'absolute',
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT,
    backgroundColor: 'red',
  },
});

export default Enemy;