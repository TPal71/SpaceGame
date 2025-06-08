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

const KEYBOARD_MOVE_SPEED = 7; // Játékos sebessége billentyűzettel

export default function App() {
  const [playerPositionState, setPlayerPositionState] = useState({ x: PLAYER_INITIAL_X, y: PLAYER_FIXED_Y });
  const playerTranslateXAnim = useRef(new Animated.Value(PLAYER_INITIAL_X)).current;
  const dragStartPlayerX = useRef(PLAYER_INITIAL_X);

  const [enemiesState, setEnemiesState] = useState([]);
  const [bulletsState, setBulletsState] = useState([]);
  const [gameOverState, setGameOverState] = useState(false);
  const [playerHealthState, setPlayerHealthState] = useState(3);
  const [scoreState, setScoreState] = useState(0);

  const playerPositionRef = useRef(playerPositionState);
  const enemiesRef = useRef(enemiesState);
  const bulletsRef = useRef(bulletsState);
  const gameOverRef = useRef(gameOverState);
  const playerHealthRef = useRef(playerHealthState);
  const scoreRef = useRef(scoreState);

  // Ref a billentyűzet állapotának tárolására (csak web)
  const keysPressedRef = useRef({ a: false, s: false });
  // Ref annak jelzésére, hogy a PanGesture aktív-e
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

  // Billentyűzet vezérlés webes platformon
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return; // Csak webes platformon fusson
    }

    const handleKeyDown = (event) => {
      if (gameOverRef.current) return; // Ne csináljon semmit, ha vége a játéknak
      const key = event.key.toLowerCase();
      if (key === 'a') {
        keysPressedRef.current.a = true;
      } else if (key === 's') { // 'S' billentyű jobbra mozgatáshoz
        keysPressedRef.current.s = true;
      }
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'a') {
        keysPressedRef.current.a = false;
      } else if (key === 's') {
        keysPressedRef.current.s = false;
      }
    };

    // Eseményfigyelők hozzáadása, ha a játék aktív
    if (!gameOverState) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }

    // Tisztító függvény: eseményfigyelők eltávolítása
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      // Billentyűk állapotának visszaállítása a biztonság kedvéért
      keysPressedRef.current = { a: false, s: false };
    };
  }, [gameOverState]); // Újra lefut, ha a gameOverState megváltozik

  const onPanGestureMove = (event) => {
    if (gameOverRef.current) return;
    const { translationX } = event.nativeEvent;
    let newX = dragStartPlayerX.current + translationX;

    if (newX < 0) newX = 0;
    else if (newX > SCREEN_WIDTH - PLAYER_WIDTH) newX = SCREEN_WIDTH - PLAYER_WIDTH;
    
    playerTranslateXAnim.setValue(newX);
  };

  const onPanHandlerStateChange = (event) => {
    if (gameOverRef.current) return;
    const { state } = event.nativeEvent;
    if (state === State.BEGAN) {
      dragStartPlayerX.current = playerPositionRef.current.x;
      isPanningRef.current = true; // Pan gesztus elkezdődött
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      // A playerPositionRef.current.x már a legfrissebb értéket tartalmazza
      // a playerTranslateXAnim listener-nek köszönhetően.
      // dragStartPlayerX.current = playerPositionRef.current.x; // Ezt a BEGAN állapot kezeli
      isPanningRef.current = false; // Pan gesztus befejeződött
    }
  };

  useEffect(() => {
    if (gameOverRef.current) return () => {};

    const gameLoop = setInterval(() => {
      if (gameOverRef.current) {
        clearInterval(gameLoop);
        return;
      }

      // Billentyűzetes mozgatás logikája (csak web és ha nincs aktív pan gesztus)
      if (Platform.OS === 'web' && !isPanningRef.current) {
        let currentX = playerPositionRef.current.x;
        let newX = currentX;

        if (keysPressedRef.current.a) {
          newX -= KEYBOARD_MOVE_SPEED;
        }
        if (keysPressedRef.current.s) {
          newX += KEYBOARD_MOVE_SPEED;
        }

        if (newX < 0) newX = 0;
        else if (newX > SCREEN_WIDTH - PLAYER_WIDTH) newX = SCREEN_WIDTH - PLAYER_WIDTH;

        if (newX !== currentX) {
          playerTranslateXAnim.setValue(newX);
        }
      }
      
      setEnemiesState(prevEnemies =>
        prevEnemies.map(enemy => ({
          ...enemy,
          y: enemy.y + 2,
        })).filter(enemy => enemy.y < SCREEN_HEIGHT)
      );

      setBulletsState(prevBullets =>
        prevBullets.map(bullet => ({
          ...bullet,
          y: bullet.y - 5,
        })).filter(bullet => bullet.y > 0)
      );
      
      checkCollisions();
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
  }, [gameOverState]); // A gameLoop és enemyGenerator újraindul, ha a gameOverState változik

  const checkCollisions = () => {
    const currentPlayerPos = playerPositionRef.current;
    let currentEnemies = [...enemiesRef.current]; 
    let currentBullets = [...bulletsRef.current];
    let currentHealth = playerHealthRef.current;
    let currentScore = scoreRef.current;
    
    if (gameOverRef.current) return;

    let gameShouldBeOver = false;

    const enemiesToRemoveAfterPlayerHit = new Set();
    let playerHitInThisFrame = false;
    
    const enemiesForPlayerCollision = [...currentEnemies];
    enemiesForPlayerCollision.forEach(enemy => {
      if (
        currentPlayerPos.x < enemy.x + ENEMY_WIDTH &&
        currentPlayerPos.x + PLAYER_WIDTH > enemy.x &&
        currentPlayerPos.y < enemy.y + ENEMY_HEIGHT &&
        currentPlayerPos.y + PLAYER_HEIGHT > enemy.y
      ) {
        if (!playerHitInThisFrame) {
            currentHealth--;
            playerHitInThisFrame = true;
        }
        enemiesToRemoveAfterPlayerHit.add(enemy.id);
        if (currentHealth <= 0) {
          currentHealth = 0;
          gameShouldBeOver = true;
        }
      }
    });
    
    if (playerHitInThisFrame || enemiesToRemoveAfterPlayerHit.size > 0) {
        setPlayerHealthState(currentHealth);
        setEnemiesState(prevEnemies => prevEnemies.filter(e => !enemiesToRemoveAfterPlayerHit.has(e.id)));
    }

    const bulletsToRemove = new Set();
    const enemiesToRemoveAfterBulletHit = new Set();
    
    // Fontos, hogy a enemiesRef.current-ből szűrjünk, ami a legfrissebb állapotot tükrözi
    // a setEnemiesState aszinkron hívásai miatt.
    const activeEnemiesForBulletCheck = enemiesRef.current.filter(e => !enemiesToRemoveAfterPlayerHit.has(e.id));

    currentBullets.forEach(bullet => { // currentBullets a checkCollisions elején lett inicializálva
      for (const enemy of activeEnemiesForBulletCheck) { 
        if (enemiesToRemoveAfterBulletHit.has(enemy.id)) {
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
          currentScore += 10;
          break; 
        }
      }
    });

    if (bulletsToRemove.size > 0) {
      setBulletsState(prevBullets => prevBullets.filter(b => !bulletsToRemove.has(b.id)));
    }
    if (enemiesToRemoveAfterBulletHit.size > 0) {
      setEnemiesState(prevEnemies => prevEnemies.filter(e => !enemiesToRemoveAfterBulletHit.has(e.id)));
    }
    
    if (currentScore !== scoreRef.current) {
      setScoreState(currentScore);
    }

    if (gameShouldBeOver && !gameOverRef.current) {
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
    isPanningRef.current = false; // Pan állapot visszaállítása
    keysPressedRef.current = { a: false, s: false }; // Billentyűzet állapot visszaállítása

    setEnemiesState([]);
    setBulletsState([]);
    setGameOverState(false);
    setPlayerHealthState(3);
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
          // enabled={Platform.OS !== 'web'} // Opcionális: PanGestureHandler letiltása weben
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
