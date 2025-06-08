import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated, Button } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Player from './components/Player';
import Enemy from './components/Enemy';
import Bullet from './components/Bullet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;
const BULLET_WIDTH = 10;
const BULLET_HEIGHT = 20;

export default function App() {
  const [playerPosition, setPlayerPosition] = useState({ x: SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2, y: SCREEN_HEIGHT - PLAYER_HEIGHT - 50 });
  const [enemies, setEnemies] = useState([]);
  const [bullets, setBullets] = useState([]);
  const [gameOver, setGameOver] = useState(false);

  const playerPositionRef = useRef(new Animated.ValueXY({ x: playerPosition.x, y: playerPosition.y })).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: playerPositionRef.x, translationY: playerPositionRef.y } }],
    { useNativeDriver: false }
  );

  useEffect(() => {
    const listener = playerPositionRef.addListener(newPosition => {
      setPlayerPosition(newPosition);
    });
    return () => {
      playerPositionRef.removeListener(listener);
    };
  }, []);


  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      // Mozgatjuk az ellenségeket
      setEnemies(prevEnemies =>
        prevEnemies.map(enemy => ({
          ...enemy,
          y: enemy.y + 2,
        })).filter(enemy => enemy.y < SCREEN_HEIGHT)
      );

      // Mozgatjuk a lövedékeket
      setBullets(prevBullets =>
        prevBullets.map(bullet => ({
          ...bullet,
          y: bullet.y - 5,
        })).filter(bullet => bullet.y > 0)
      );

      // Ütközésvizsgálat
      checkCollisions();
    }, 16); // ~60 FPS

    const enemyGenerator = setInterval(() => {
      const newEnemy = {
        id: Date.now(),
        x: Math.random() * (SCREEN_WIDTH - ENEMY_WIDTH),
        y: -ENEMY_HEIGHT,
      };
      setEnemies(prevEnemies => [...prevEnemies, newEnemy]);
    }, 1500);

    return () => {
      clearInterval(gameLoop);
      clearInterval(enemyGenerator);
    };
  }, [gameOver]);

  const checkCollisions = () => {
    // Ellenség és játékos ütközése
    enemies.forEach(enemy => {
      if (
        playerPosition.x < enemy.x + ENEMY_WIDTH &&
        playerPosition.x + PLAYER_WIDTH > enemy.x &&
        playerPosition.y < enemy.y + ENEMY_HEIGHT &&
        playerPosition.y + PLAYER_HEIGHT > enemy.y
      ) {
        setGameOver(true);
      }
    });

    // Lövedék és ellenség ütközése
    bullets.forEach(bullet => {
      enemies.forEach(enemy => {
        if (
          bullet.x < enemy.x + ENEMY_WIDTH &&
          bullet.x + BULLET_WIDTH > enemy.x &&
          bullet.y < enemy.y + ENEMY_HEIGHT &&
          bullet.y + BULLET_HEIGHT > enemy.y
        ) {
          setEnemies(prevEnemies => prevEnemies.filter(e => e.id !== enemy.id));
          setBullets(prevBullets => prevBullets.filter(b => b.id !== bullet.id));
        }
      });
    });
  };

  const handleShoot = () => {
    if (gameOver) return;
    const newBullet = {
      id: Date.now(),
      x: playerPosition.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
      y: playerPosition.y,
    };
    setBullets(prevBullets => [...prevBullets, newBullet]);
  };

  const restartGame = () => {
    setPlayerPosition({ x: SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2, y: SCREEN_HEIGHT - PLAYER_HEIGHT - 50 });
    playerPositionRef.setValue({ x: SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2, y: SCREEN_HEIGHT - PLAYER_HEIGHT - 50 });
    setEnemies([]);
    setBullets([]);
    setGameOver(false);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.gameArea}>
        {gameOver && (
          <View style={styles.gameOverContainer}>
            <Button title="Újraindítás" onPress={restartGame} />
          </View>
        )}
        <PanGestureHandler onGestureEvent={onGestureEvent}>
          <Animated.View style={{ transform: [{ translateX: playerPositionRef.x }, { translateY: playerPositionRef.y }] }}>
            <Player />
          </Animated.View>
        </PanGestureHandler>
        {enemies.map(enemy => (
          <Enemy key={enemy.id} x={enemy.x} y={enemy.y} />
        ))}
        {bullets.map(bullet => (
          <Bullet key={bullet.id} x={bullet.x} y={bullet.y} />
        ))}
      </View>
      <View style={styles.controls}>
        <Button title="Lövés" onPress={handleShoot} disabled={gameOver} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gameArea: {
    flex: 1,
  },
  gameOverContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 50,
    left: SCREEN_WIDTH / 2 - 75,
    zIndex: 10,
  },
  controls: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});