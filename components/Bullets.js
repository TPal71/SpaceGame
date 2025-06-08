import React from 'react';
import { View, StyleSheet } from 'react-native';

const BULLET_WIDTH = 10;
const BULLET_HEIGHT = 20;

const Bullet = ({ x, y }) => {
  return <View style={[styles.bullet, { left: x, top: y }]} />;
};

const styles = StyleSheet.create({
  bullet: {
    position: 'absolute',
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    backgroundColor: 'yellow',
  },
});

export default Bullet;