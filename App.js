import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated, Button, Text, Platform } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Player from './components/Player.js';
import Enemy from './components/Enemy';
import Bullet from './components/Bullet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;
const BULLET_WIDTH = 10;
const BULLET_HEIGHT = 20;

const CONTROLS_HEIGHT = 100;
const PLAYER_VERTICAL_MARGIN_FROM_CONTROLS = 20;

const PLAYER_INITIAL_X = SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2;
const PLAYER_FIXED_Y = SCREEN_HEIGHT - PLAYER_HEIGHT - CONTROLS_HEIGHT - PLAYER_VERTICAL_MARGIN_FROM_CONTROLS;

const KEYBOARD_MOVE_SPEED = 7;
const ENEMY_VERTICAL_SPEED = 2;
const BULLET_VERTICAL_SPEED = 5;

// Új konstansok az életerőhöz és pontszámhoz
const INITIAL_PLAYER_HEALTH = 100;
const HEALTH_DECREASE_ON_ESCAPE = 5; // Életerő csökkenés, ha egy ellenség elmenekül
const HEALTH_INCREASE_ON_KILL = 10;  // Életerő növekedés, ha lelövünk egy ellenséget
const SCORE_INCREASE_ON_KILL = 10;   // Pontszám növekedés, ha lelövünk egy ellenséget
const PLAYER_DAMAGE_ON_HIT = 25;     // Életerő csökkenés, ha a játékost eltalálja egy ellenség (az eredeti 1 helyett)


export default function App() {
  const [playerPositionState, setPlayerPositionState] = useState({ x: PLAYER_INITIAL_X, y: PLAYER_FIXED_Y });
  const playerTranslateXAnim = useRef(new Animated.Value(PLAYER_INITIAL_X)).current;
  const dragStartPlayerX = useRef(PLAYER_INITIAL_X);

  const [enemiesState, setEnemiesState] = useState([]);
  const [bulletsState, setBulletsState] = useState([]);
  const [gameOverState, setGameOverState] = useState(false);
  // Életerő inicializálása az új konstanssal
  const [playerHealthState, setPlayerHealthState] = useState(INITIAL_PLAYER_HEALTH);
  const [scoreState, setScoreState] = useState(0);

  const playerPositionRef = useRef(playerPositionState);
  const enemiesRef = useRef(enemiesState);
  const bulletsRef = useRef(bulletsState);
  const gameOverRef = useRef(gameOverState);
  const playerHealthRef = useRef(playerHealthState);
  const scoreRef = useRef(scoreState);

  const keysPressedRef = useRef({ a: false, s: false });
  const isPanningRef = useRef(false);

  useEffect(() => { playerPositionRef.current = playerPositionState; }, [playerPositionState]);
  useEffect(() => { enemiesRef.current = enemiesState; }, [enemiesState]);
  useEffect(() => { bulletsRef.current = bulletsState; }, [bulletsState]);
  useEffect(() => { gameOverRef.current = gameOverState; }, [gameOverState]);
  useEffect(() => { playerHealthRef.current = playerHealthState; }, [playerHealthState]);
  useEffect(() => { scoreRef.current = scoreState; }, [scoreState]);

  useEffect(() => {
    const listenerId = playerTranslateXAnim.addListener(({ value }) => {
      setPlayerPositionState({ x: value, y: PLAYER_FIXED_Y });
    });
    return () => {
      playerTranslateXAnim.removeListener(listenerId);
    };
  }, [playerTranslateXAnim]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    const handleKeyDown = (event) => {
      if (gameOverRef.current) return;
      const key = event.key.toLowerCase();
      if (key === 'a') keysPressedRef.current.a = true;
      else if (key === 's') keysPressedRef.current.s = true;
    };
    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'a') keysPressedRef.current.a = false;
      else if (key === 's') keysPressedRef.current.s = false;
    };
    if (!gameOverState) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysPressedRef.current = { a: false, s: false };
    };
  }, [gameOverState]);

  const onPanGestureMove = (event) => {
    if (gameOverRef.current) return;
    const { translationX } = event.nativeEvent;
    let newX = dragStartPlayerX.current + translationX;
    newX = Math.max(0, Math.min(newX, SCREEN_WIDTH - PLAYER_WIDTH));
    playerTranslateXAnim.setValue(newX);
  };

  const onPanHandlerStateChange = (event) => {
    if (gameOverRef.current) return;
    const { state } = event.nativeEvent;
    if (state === State.BEGAN) {
      dragStartPlayerX.current = playerPositionRef.current.x;
      isPanningRef.current = true;
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      isPanningRef.current = false;
    }
  };

  useEffect(() => {
    if (gameOverRef.current) return () => {};

    const gameLoop = setInterval(() => {
      if (gameOverRef.current) {
        clearInterval(gameLoop);
        return;
      }

      if (Platform.OS === 'web' && !isPanningRef.current) {
        let currentX = playerPositionRef.current.x;
        let newX = currentX;
        if (keysPressedRef.current.a) newX -= KEYBOARD_MOVE_SPEED;
        if (keysPressedRef.current.s) newX += KEYBOARD_MOVE_SPEED;
        newX = Math.max(0, Math.min(newX, SCREEN_WIDTH - PLAYER_WIDTH));
        if (newX !== currentX) playerTranslateXAnim.setValue(newX);
      }
      
      // Ellenségek mozgatása és elmenekültek kezelése
      let healthLostFromEscapesThisFrame = 0;
      setEnemiesState(prevEnemies => {
        const remainingEnemies = [];
        prevEnemies.forEach(enemy => {
          const newY = enemy.y + ENEMY_VERTICAL_SPEED;
          if (newY < SCREEN_HEIGHT) {
            remainingEnemies.push({ ...enemy, y: newY });
          } else {
            // Ellenség elmenekült
            healthLostFromEscapesThisFrame += HEALTH_DECREASE_ON_ESCAPE;
          }
        });
        return remainingEnemies;
      });

      if (healthLostFromEscapesThisFrame > 0) {
        setPlayerHealthState(prevHealth => {
          const newHealth = Math.max(0, prevHealth - healthLostFromEscapesThisFrame);
          if (newHealth <= 0 && !gameOverRef.current) {
            setGameOverState(true);
          }
          return newHealth;
        });
      }

      setBulletsState(prevBullets =>
        prevBullets.map(bullet => ({
          ...bullet,
          y: bullet.y - BULLET_VERTICAL_SPEED,
        })).filter(bullet => bullet.y > 0)
      );
      
      checkCollisions();

      // Biztonsági ellenőrzés a játék végére, ha az életerő elfogyott
      if (playerHealthRef.current <= 0 && !gameOverRef.current) {
        setGameOverState(true);
      }

    }, 16);

    const enemyGenerator = setInterval(() => {
      if (gameOverRef.current) {
        clearInterval(enemyGenerator);
        return;
      }
      const newEnemy = {
        id: Date.now() + Math.random(),
        x: Math.random() * (SCREEN_WIDTH - ENEMY_WIDTH),
        y: -ENEMY_HEIGHT,
      };
      setEnemiesState(prevEnemies => [...prevEnemies, newEnemy]);
    }, 1500);

    return () => {
      clearInterval(gameLoop);
      clearInterval(enemyGenerator);
    };
  }, [gameOverState]);

  const checkCollisions = () => {
    if (gameOverRef.current) return;

    const currentPlayerPos = playerPositionRef.current;
    // Fontos, hogy a ref-ekböl olvassuk ki az aktuális értékeket a checkCollisions elején
    let currentHealth = playerHealthRef.current;
    let currentScore = scoreRef.current;
    const currentEnemies = [...enemiesRef.current]; // Másolat az iterációhoz
    const currentBullets = [...bulletsRef.current]; // Másolat az iterációhoz

    let gameShouldBeOver = false; // Lokális változó annak jelzésére, ha ebben a ciklusban lesz vége a játéknak

    // 1. Ellenség és játékos ütközése
    const enemiesToRemoveAfterPlayerHit = new Set();
    let playerWasHitThisFrame = false; // Hogy egy képkockában csak egyszer sebezzenek az ellenségek
    
    // Iterálás a currentEnemies másolaton
    for (const enemy of currentEnemies) {
      if (
        currentPlayerPos.x < enemy.x + ENEMY_WIDTH &&
        currentPlayerPos.x + PLAYER_WIDTH > enemy.x &&
        currentPlayerPos.y < enemy.y + ENEMY_HEIGHT &&
        currentPlayerPos.y + PLAYER_HEIGHT > enemy.y
      ) {
        if (!playerWasHitThisFrame) {
            currentHealth -= PLAYER_DAMAGE_ON_HIT; // Konstans használata a sebzéshez
            playerWasHitThisFrame = true;
        }
        enemiesToRemoveAfterPlayerHit.add(enemy.id);
        if (currentHealth <= 0) {
          currentHealth = 0;
          gameShouldBeOver = true;
        }
      }
    }
    
    // Lövedék és ellenség ütközése
    const bulletsToRemove = new Set();
    const enemiesToRemoveAfterBulletHit = new Set();
    
    // Iterálás a currentBullets másolaton
    for (const bullet of currentBullets) {
      // Iterálás a currentEnemies másolaton (azok, amik még nem lettek játékos által eltávolítva)
      for (const enemy of currentEnemies) { 
        // Ha az ellenséget már eltalálta a játékos vagy egy másik lövedék ebben a körben, ne vizsgáljuk újra
        if (enemiesToRemoveAfterPlayerHit.has(enemy.id) || enemiesToRemoveAfterBulletHit.has(enemy.id)) {
            continue;
        }
        if (
          bullet.x < enemy.x + ENEMY_WIDTH &&
          bullet.x + BULLET_WIDTH > enemy.x &&
          bullet.y < enemy.y + ENEMY_HEIGHT &&
          bullet.y + BULLET_HEIGHT > enemy.y
        ) {
          bulletsToRemove.add(bullet.id);
          enemiesToRemoveAfterBulletHit.add(enemy.id);
          currentScore += SCORE_INCREASE_ON_KILL;
          currentHealth += HEALTH_INCREASE_ON_KILL;
          // Opcionális: Életerő maximalizálása
          currentHealth = Math.min(INITIAL_PLAYER_HEALTH, currentHealth); 
          break; 
        }
      }
    }

    // Állapotok frissítése az ütközések után
    if (playerWasHitThisFrame || currentHealth !== playerHealthRef.current) {
        setPlayerHealthState(Math.max(0, currentHealth));
    }
    if (currentScore !== scoreRef.current) {
      setScoreState(currentScore);
    }

    const finalEnemiesToRemove = new Set([...enemiesToRemoveAfterPlayerHit, ...enemiesToRemoveAfterBulletHit]);
    if (finalEnemiesToRemove.size > 0) {
      setEnemiesState(prevEnemies => prevEnemies.filter(e => !finalEnemiesToRemove.has(e.id)));
    }
    if (bulletsToRemove.size > 0) {
      setBulletsState(prevBullets => prevBullets.filter(b => !bulletsToRemove.has(b.id)));
    }
    
    // Játék vége ellenőrzése a checkCollisions végén
    if (gameShouldBeOver && !gameOverRef.current) {
      setGameOverState(true);
    } else if (playerHealthRef.current <= 0 && !gameOverRef.current) { // Ha az életerő frissítés után lett 0
        setGameOverState(true);
    }
  };

  const handleShoot = () => {
    if (gameOverRef.current) return;
    const newBullet = {
      id: Date.now() + Math.random(),
      x: playerPositionRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
      y: playerPositionRef.current.y,
    };
    setBulletsState(prevBullets => [...prevBullets, newBullet]);
  };

  const restartGame = () => {
    playerTranslateXAnim.setValue(PLAYER_INITIAL_X);
    setPlayerPositionState({ x: PLAYER_INITIAL_X, y: PLAYER_FIXED_Y });
    dragStartPlayerX.current = PLAYER_INITIAL_X;
    isPanningRef.current = false;
    keysPressedRef.current = { a: false, s: false };

    setEnemiesState([]);
    setBulletsState([]);
    setGameOverState(false);
    // Életerő visszaállítása az új konstanssal
    setPlayerHealthState(INITIAL_PLAYER_HEALTH);
    setScoreState(0);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Életerő: {playerHealthState}</Text>
        <Text style={styles.statsText}>Pontszám: {scoreState}</Text>
      </View>
      <View style={styles.gameArea}>
        <PanGestureHandler
          onGestureEvent={onPanGestureMove}
          onHandlerStateChange={onPanHandlerStateChange}
        >
          <Animated.View style={{
            position: 'absolute',
            top: PLAYER_FIXED_Y,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            transform: [{ translateX: playerTranslateXAnim }],
            zIndex: 20,
          }}>
            <Player />
          </Animated.View>
        </PanGestureHandler>

        {enemiesState.map(enemy => (
          <Enemy key={enemy.id} x={enemy.x} y={enemy.y} />
        ))}
        {bulletsState.map(bullet => (
          <Bullet key={bullet.id} x={bullet.x} y={bullet.y} />
        ))}

        {gameOverState && (
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>Játék Vége!</Text>
            <Button title="Újraindítás" onPress={restartGame} />
          </View>
        )}
      </View>
      <View style={styles.controls}>
        <Button title="Lövés" onPress={handleShoot} disabled={gameOverState} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  statsContainer: {
    paddingTop: Platform.OS === 'ios' ? 40 : 20, 
    paddingBottom: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111', 
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameArea: {
    flex: 1,
  },
  gameOverContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 80, 
    left: SCREEN_WIDTH / 2 - 100, 
    width: 200,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 100,
  },
  gameOverText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  controls: {
    height: CONTROLS_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#111',
  },
});
