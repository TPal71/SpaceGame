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

const PLAYER_INITIAL_X = SCREEN_WIDTH / 2 - PLAYER_WIDTH / 2;
const PLAYER_FIXED_Y = SCREEN_HEIGHT - PLAYER_HEIGHT - 50;

export default function App() {
  const [playerPositionState, setPlayerPositionState] = useState({ x: PLAYER_INITIAL_X, y: PLAYER_FIXED_Y });
  const playerTranslateXAnim = useRef(new Animated.Value(PLAYER_INITIAL_X)).current;
  const dragStartPlayerX = useRef(PLAYER_INITIAL_X);

  const [enemiesState, setEnemiesState] = useState([]);
  const [bulletsState, setBulletsState] = useState([]);
  const [gameOverState, setGameOverState] = useState(false);
  const [playerHealthState, setPlayerHealthState] = useState(3);
  const [scoreState, setScoreState] = useState(0);

  // Referenciák az állapotok aktuális értékének tárolására
  const playerPositionRef = useRef(playerPositionState);
  const enemiesRef = useRef(enemiesState);
  const bulletsRef = useRef(bulletsState);
  const gameOverRef = useRef(gameOverState);
  const playerHealthRef = useRef(playerHealthState);
  const scoreRef = useRef(scoreState);

  // Referenciák frissítése, ha az állapotok változnak
  useEffect(() => { playerPositionRef.current = playerPositionState; }, [playerPositionState]);
  useEffect(() => { enemiesRef.current = enemiesState; }, [enemiesState]);
  useEffect(() => { bulletsRef.current = bulletsState; }, [bulletsState]);
  useEffect(() => { gameOverRef.current = gameOverState; }, [gameOverState]);
  useEffect(() => { playerHealthRef.current = playerHealthState; }, [playerHealthState]);
  useEffect(() => { scoreRef.current = scoreState; }, [scoreState]);


  useEffect(() => {
    const listenerId = playerTranslateXAnim.addListener(({ value }) => {
      // Itt setPlayerPositionState-et használunk, hogy a playerPositionRef is frissüljön
      setPlayerPositionState({ x: value, y: PLAYER_FIXED_Y });
    });
    return () => {
      playerTranslateXAnim.removeListener(listenerId);
    };
  }, [playerTranslateXAnim, PLAYER_FIXED_Y]);

  const onPanGestureMove = (event) => {
    if (gameOverRef.current) return; // Ref olvasása
    const { translationX } = event.nativeEvent;
    let newX = dragStartPlayerX.current + translationX;

    if (newX < 0) newX = 0;
    else if (newX > SCREEN_WIDTH - PLAYER_WIDTH) newX = SCREEN_WIDTH - PLAYER_WIDTH;
    
    playerTranslateXAnim.setValue(newX);
  };

  const onPanHandlerStateChange = (event) => {
    if (gameOverRef.current) return; // Ref olvasása
    const { state } = event.nativeEvent;
    if (state === State.BEGAN) {
      dragStartPlayerX.current = playerPositionRef.current.x; // Ref olvasása
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      dragStartPlayerX.current = playerPositionRef.current.x; // Ref olvasása
    }
  };

  // Játékciklus és ellenséggenerátor
  useEffect(() => {
    if (gameOverRef.current) return () => {}; // Kezdeti ellenőrzés ref alapján

    const gameLoop = setInterval(() => {
      if (gameOverRef.current) { // Ellenőrzés minden ciklusban
        clearInterval(gameLoop); // Leállítjuk, ha vége a játéknak
        return;
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
      if (gameOverRef.current) { // Ellenőrzés
        clearInterval(enemyGenerator);
        return;
      }
      const newEnemy = {
        id: Date.now(),
        x: Math.random() * (SCREEN_WIDTH - ENEMY_WIDTH),
        y: -ENEMY_HEIGHT,
      };
      setEnemiesState(prevEnemies => [...prevEnemies, newEnemy]);
    }, 1500);

    return () => {
      clearInterval(gameLoop);
      clearInterval(enemyGenerator);
    };
  }, [gameOverState]); // Csak akkor indul újra, ha a gameOverState megváltozik (a refek kezelik a belső logikát)

  const checkCollisions = () => {
    // Olvassuk az aktuális értékeket a ref-ekből
    const currentPlayerPos = playerPositionRef.current;
    // Fontos, hogy másolatokkal dolgozzunk, ha módosítani akarjuk őket lokálisan
    let currentEnemies = [...enemiesRef.current]; 
    let currentBullets = [...bulletsRef.current];
    let currentHealth = playerHealthRef.current;
    let currentScore = scoreRef.current;
    
    if (gameOverRef.current) return;

    let gameShouldBeOver = false;

    // 1. Ellenség és játékos ütközése
    const enemiesToRemoveAfterPlayerHit = new Set();
    let playerHitInThisFrame = false;
    
    const enemiesForPlayerCollision = [...currentEnemies]; // Másolat az iterációhoz
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
    
    let enemiesAfterPlayerCollision = currentEnemies;
    if (playerHitInThisFrame || enemiesToRemoveAfterPlayerHit.size > 0) {
        setPlayerHealthState(currentHealth); // Közvetlen állapotfrissítés
        enemiesAfterPlayerCollision = currentEnemies.filter(e => !enemiesToRemoveAfterPlayerHit.has(e.id));
        setEnemiesState(enemiesAfterPlayerCollision); // Közvetlen állapotfrissítés
    }

    // 2. Lövedék és ellenség ütközése
    const bulletsToRemove = new Set();
    const enemiesToRemoveAfterBulletHit = new Set();

    // Az `enemiesAfterPlayerCollision` tartalmazza azokat az ellenségeket,
    // amelyek túlélték a játékossal való ütközést ebben a `checkCollisions` hívásban.
    const bulletsForCollisionCheck = [...currentBullets]; // Másolat az iterációhoz
    bulletsForCollisionCheck.forEach(bullet => {
      // Fontos, hogy az `enemiesAfterPlayerCollision` naprakész listáján iteráljunk,
      // vagy ha az setEnemiesState aszinkron, akkor a enemiesRef.current frissített másolatán.
      // A biztonság kedvéért használjuk az `enemiesAfterPlayerCollision` lokális másolatot,
      // ami a játékosütközés utáni állapotot tükrözi ebben a függvényhívásban.
      for (const enemy of enemiesAfterPlayerCollision) { 
        if (enemiesToRemoveAfterBulletHit.has(enemy.id)) { // Ha már eltalálta másik lövedék ebben a körben
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
      // A prevEnemies itt a setEnemiesState hívásakor aktuális enemiesState lesz.
      // Ez már tartalmaznia kell a játékosütközés miatti eltávolításokat, ha a setEnemiesState szinkron lenne,
      // de mivel aszinkron, a prevEnemies a legutóbbi render állapotát tükrözi.
      // A legbiztosabb, ha a filter csak a lövedékütközésekre koncentrál.
      setEnemiesState(prevEnemies => prevEnemies.filter(e => !enemiesToRemoveAfterBulletHit.has(e.id)));
    }
    
    // Pontszám frissítése
    if (currentScore !== scoreRef.current) { // Olvasás ref-ből a primer állapot helyett
      setScoreState(currentScore);
    }

    if (gameShouldBeOver && !gameOverRef.current) { // Olvasás ref-ből
      setGameOverState(true);
    }
  };

  const handleShoot = () => {
    if (gameOverRef.current) return; // Ref olvasása
    const newBullet = {
      id: Date.now(),
      x: playerPositionRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2, // Ref olvasása
      y: playerPositionRef.current.y, // Ref olvasása
    };
    setBulletsState(prevBullets => [...prevBullets, newBullet]);
  };

  const restartGame = () => {
    playerTranslateXAnim.setValue(PLAYER_INITIAL_X);
    // Itt is a State-et állítjuk, ami majd frissíti a ref-et
    setPlayerPositionState({ x: PLAYER_INITIAL_X, y: PLAYER_FIXED_Y });
    dragStartPlayerX.current = PLAYER_INITIAL_X;

    setEnemiesState([]);
    setBulletsState([]);
    setGameOverState(false);
    setPlayerHealthState(3);
    setScoreState(0);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.statsContainer}>
        {/* Itt az állapotváltozókat (state) használjuk a megjelenítéshez, ami rendben van */}
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
            left: playerTranslateXAnim,
            top: PLAYER_FIXED_Y,
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            // backgroundColor: 'rgba(255, 0, 255, 0.5)', // Player vizuális megjelenítése a Player komponensben van
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
  // ... (styles változatlanok)
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
    zIndex: 10, 
  },
  gameOverText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  controls: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#111',
  },
});
