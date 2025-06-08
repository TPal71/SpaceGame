import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;

const Player = () => {
  return (
    <View style={styles.player}>
       {/* Használhatsz saját képet is: <Image source={require('../assets/spaceship.png')} style={styles.playerImage} /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  player: {
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    backgroundColor: 'cyan',
    borderRadius: 25,
  },
  // playerImage: {
  //   width: '100%',
  //   height: '100%',
  // },
});

export default Player;