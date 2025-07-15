const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();


// Upgrade system
const upgrades = {
  speed: {
    level: 0,
    baseCost: 10,
    costIncrease: 5,
    costMultiplier: 1.2,
    maxLevel: 20,
    effect: function () { player.maxSpeed = 250 + 25 * this.level; }
  },
  engine: {
    level: 0,
    baseCost: 10,
    costIncrease: 5,
    costMultiplier: 1.2,
    maxLevel: 20,
    effect: function () { player.acceleration = 500 + 40 * this.level; }
  },
  brakes: {
    level: 0,
    baseCost: 15,
    costIncrease: 5,
    costMultiplier: 1.2,
    maxLevel: 20,
    effect: function () { player.deceleration = 0.6 + 0.06 * this.level; }
  },
  armor: {
    level: 0,
    baseCost: 80,
    costIncrease: 0.5,
    maxLevel: Infinity,
    effect: function () {} // Passive effect
  }
};

function loadUpgrades() {
  const saved = localStorage.getItem('upgrades');
  if (saved) {
    const parsed = JSON.parse(saved);
    for (let key in parsed) {
      if (upgrades[key]) {
        upgrades[key].level = parsed[key].level;
      }
    }
    applyUpgradeEffects();
  }
}

function saveUpgrades() {
  const toSave = {};
  for (let key in upgrades) {
    toSave[key] = { level: upgrades[key].level };
  }
  localStorage.setItem('upgrades', JSON.stringify(toSave));
}

function applyUpgradeEffects() {
  Object.values(upgrades).forEach(upg => upg.effect());
}

function getUpgradeCost(type) {
  const upg = upgrades[type];
  if (type === 'armor') {
    return upg.baseCost * Math.pow(1 + upg.costIncrease, upg.level);
  }
  return Math.floor((upg.baseCost + upg.costIncrease * upg.level) * Math.pow(upg.costMultiplier, upg.level));
}

function purchaseUpgrade(type) {
  const upg = upgrades[type];
  const cost = getUpgradeCost(type);

  if (totalCoins >= cost && (upg.maxLevel === Infinity || upg.level < upg.maxLevel)) {
    totalCoins -= cost;
    upg.level++;
    upg.effect();
    localStorage.setItem('totalCoins', totalCoins.toString());
    saveUpgrades();
    updateUpgradeDisplays();
    updateTotalCoinsDisplay();
    const btn = document.querySelector(`button[onclick="purchaseUpgrade('${type}')"]`);
    if (btn) {
      btn.classList.add('animate-pulse');
      setTimeout(() => btn.classList.remove('animate-pulse'), 500);
    }
  } else {
    alert(totalCoins < cost ? "Not enough coins!" : "Maximum level reached!");
  }
}

function updateTotalCoinsDisplay() {
  document.getElementById('totalCoinsDisplay').textContent = totalCoins;
}

function showUpgradeScreen() {
  updateTotalCoinsDisplay();
  updateUpgradeDisplays();
}


function updateUpgradeDisplays() {
  for (let key in upgrades) {
    const display = document.getElementById(`${key}UpgradeLevel`);
    if (display) {
      display.textContent = upgrades[key].level;
    }
    const costDisplay = document.getElementById(`${key}UpgradeCost`);
    if (costDisplay) {
      costDisplay.textContent = Math.floor(getUpgradeCost(key));
    }
  }
}

function resetArmor() {
  upgrades.armor._refreshedLevel = upgrades.armor.level;
}

function consumeArmor() {
  if (upgrades.armor._refreshedLevel > 0) {
    upgrades.armor._refreshedLevel--;
    return true;
  }
  return false;
}


function refreshUpgradeUIState() {
  for (let key in upgrades) {
    if (document.getElementById(`${key}UpgradeLevel`)) {
      document.getElementById(`${key}UpgradeLevel`).textContent = upgrades[key].level;
    }
    if (document.getElementById(`${key}UpgradeCost`)) {
      document.getElementById(`${key}UpgradeCost`).textContent = Math.floor(getUpgradeCost(key));
    }
  }
}

window.addEventListener('resize', resize);
resize();


// UPGRADE SYSTEM UPWARD 


  const player = {
    x: w / 2, y: h / 2,
    vx: 0, vy: 0,
    speed: 200,
    maxSpeed: 250,
    acceleration: 500,
    deceleration: 0.6,
    angle: 0,          // unfortunately, radians
    turnSpeed: 3.5,
    currentDirection: 0,
    directionAngles: [    
        0,                
        Math.PI * 0.25, 
        Math.PI * 0.5,  
        Math.PI * 0.75, 
        Math.PI,        
        Math.PI * 1.25, 
        Math.PI * 1.5,  
        Math.PI * 1.75  
    ],
    directionThreshold: Math.PI / 8
};

  const playerSprites = new Array(8).fill(null).map((_, i) => {
    const img = new Image();
    img.src = `img/sprite/player_${i + 1}.png`; // Player_1.png to Player_8.png 
    return img;
  });  

  // preloads sprites to hopefully stop the (fricking) fallback glitch
  let spritesLoaded = 0;
  playerSprites.forEach(sprite => {
    sprite.onload = () => {
      spritesLoaded++;
    };  
  });
  

  const enemyTypes = {
    normal: { color: 'red', size: 24, speed: 100, accel: 300 },
    shooter: { color: 'blue', size: 22, speed: 150, accel: 400, fireRate: 2.5 },
    thief: { color: 'purple', size: 22, speed: 180, accel: 500 } 
  };

  // game state, score tracking
  let totalCoins = localStorage.getItem('totalCoins') ? parseInt(localStorage.getItem('totalCoins')) : 0;
  let score = 0;
  let bestScore = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore')) : 0;
  const coins = [];
  const enemies = [];
  const bullets = [];
  let coinSpawnRate = 2.0;
  let enemySpawnRate = 3.0;
  let lastCoinTime = 0;
  let lastEnemyTime = 0;
  
  const keys = {};
  window.addEventListener('keydown', e => keys[e.key] = true);
  window.addEventListener('keyup', e => keys[e.key] = false);


const coinTypes = [  // Hello there! well, if you are wondering why i chose such odd names: they help me memorize a lot easier which ones are the higher value resources
  {
    name: "gold",
    value: 1,
    spawnChance: 0.75, // 75%
    size: 16
  },
  {
    name: "silver",
    value: 2,
    spawnChance: 0.20, // 20%
    size: 20
  },
  {
    name: "diamond",
    value: 5,
    spawnChance: 0.05, // 5%
    size: 24
  }
];

const coinSprites = {
  gold: new Image(),
  silver: new Image(),
  diamond: new Image()
};

coinSprites.gold.src = 'https://github.com/PedroCFerro/Trator-Antinseto/blob/main/img/sprite/coin_1.png?raw=true';
coinSprites.silver.src = 'img/sprite/coin_2.png';
coinSprites.diamond.src = 'img/sprite/coin_3.png';


function spawnCoin() {
  const rand = Math.random();
  let cumulativeChance = 0;
  let selectedType;
  
  for (const type of coinTypes) {
    cumulativeChance += type.spawnChance;
    if (rand <= cumulativeChance) {
      selectedType = type;
      break;
    }
  }
  
  coins.push({
    x: Math.random() * w,
    y: Math.random() * h,
    size: selectedType.size,
    type: selectedType.name,
    value: selectedType.value
  });
}

function spawnEnemy() {
  const type = Object.keys(enemyTypes)[Math.floor(Math.random() * 3)];
  const e = Object.assign({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: 0, vy: 0,
    lastShot: performance.now()
  }, enemyTypes[type]);
  enemies.push(e);
}

function handleInput(dt) {   // this took me 5 years and a half
  const turningLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];
  const turningRight = keys['ArrowRight'] || keys['d'] || keys['D'];
  const movingForward = keys['ArrowUp'] || keys['w'] || keys['W'];
  const movingBackward = keys['ArrowDown'] || keys['s'] || keys['S'];

  if (turningLeft) {
    player.angle -= player.turnSpeed * dt;
  }
  if (turningRight) {
    player.angle += player.turnSpeed * dt;
  }
  
  const cos = Math.cos(player.angle);
  const sin = Math.sin(player.angle);
  
  if (movingForward) {
    player.vx += cos * player.acceleration * dt;
    player.vy += sin * player.acceleration * dt;
  }
  if (movingBackward) {
    player.vx -= cos * player.acceleration * dt;
    player.vy -= sin * player.acceleration * dt;
  }

  // deceleration
  player.vx *= (1 - player.deceleration * dt);
  player.vy *= (1 - player.deceleration * dt);

  // max speed
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > player.maxSpeed) {
    const scale = player.maxSpeed / speed;
    player.vx *= scale;
    player.vy *= scale;
  }

  // update position
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // restraining order check
  player.x = Math.max(0, Math.min(w, player.x));
  player.y = Math.max(0, Math.min(h, player.y));

  updateSpriteDirection();  
}


function updateSpriteDirection() {
  // average the angle to be between 0 and 2π (whatever that means)
  const normalizedAngle = (player.angle + Math.PI * 2) % (Math.PI * 2);
  
  // get closest match
  let minDiff = Infinity;
  let bestDirection = 0;
  
  for (let i = 0; i < player.directionAngles.length; i++) {
    // calculate difference of angles
    const diff = Math.abs(normalizedAngle - player.directionAngles[i]);
    // calculate circular diffs (2π wraps around) (whatever that means again, thanks AI :]  )
    const circularDiff = Math.min(diff, Math.PI * 2 - diff);
    
    if (circularDiff < minDiff) {
      minDiff = circularDiff;
      bestDirection = i;
    }
  }
  
  player.currentDirection = bestDirection;
}

  function updateEnemies(dt, now) {
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i]) continue;
        
        const e = enemies[i];
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
      
      // path tracking
      e.vx += (dx / dist) * e.accel * dt;
      e.vy += (dy / dist) * e.accel * dt;
      
      // the law forbids exceeding the limit of speed
      const speed = Math.hypot(e.vx, e.vy);
      if (speed > e.speed) {
        e.vx = (e.vx / speed) * e.speed;
        e.vy = (e.vy / speed) * e.speed;
      }
      
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      
      // collider
if (dist < e.size + 20) {
  if (upgrades.armor.level > 0) {
    upgrades.armor.level--;
    enemies.splice(i, 1);
    saveUpgrades();
  } else {
    if (score > bestScore) bestScore = score;
    localStorage.setItem('bestScore', bestScore.toString());
    document.getElementById('bestScore').textContent = bestScore;
    resetGameState();
  }
}

      // bullet firer
      if (e.color === 'blue' && now - e.lastShot > e.fireRate * 1000) {
        const bulletSpeed = 300;
        bullets.push({
          x: e.x, y: e.y,
          vx: (dx / dist) * bulletSpeed,
          vy: (dy / dist) * bulletSpeed,
          size: 6
        });
        e.lastShot = now;
      }

      // thief logic
      if (e.color === 'purple' && coins.length > 0) {
        let closest = coins[0];
        let minDist = Math.hypot(closest.x - e.x, closest.y - e.y);
        
        for (const c of coins) {
          const d = Math.hypot(c.x - e.x, c.y - e.y);
          if (d < minDist) {
            minDist = d;
            closest = c;
          }
        }
        
        const dxC = closest.x - e.x;
        const dyC = closest.y - e.y;
        const distC = Math.max(1, Math.hypot(dxC, dyC));
        
        const playerWeight = 0.1;  // 0.3
        const coinWeight = 0.9;    // 0.7
        
        // horrifying mathematics to "motivate" thief
        e.vx += playerWeight * (dx / dist) * e.accel * dt;
        e.vy += playerWeight * (dy / dist) * e.accel * dt;
        e.vx += coinWeight * (dxC / distC) * e.accel * dt * 1.5; // 50% speed boost when chasing coins
        e.vy += coinWeight * (dyC / distC) * e.accel * dt * 1.5;
        
        if (distC < e.size + closest.size) {
          const coinIndex = coins.indexOf(closest);
          if (coinIndex !== -1) {
            coins.splice(coinIndex, 1);
          }
        }
      }
    }
  }


  


 function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        
        // hit player
        const distanceToPlayer = Math.hypot(b.x - player.x, b.y - player.y);
        if (distanceToPlayer < 20 + b.size) {
            if (upgrades.armor.level > 0) {
                upgrades.armor.level--;
                saveUpgrades();
            } else {
                // RIP
                if (score > bestScore) {
                    bestScore = score;
                    localStorage.setItem('bestScore', bestScore.toString());
                    document.getElementById('bestScore').textContent = bestScore;
                }
                enemies.length = 0;
                coins.length = 0;
                bullets.length = 0;
                score = 0;
                return;
            }
            bullets.splice(i, 1);
            continue;
          }
      
      // removes bullet in case they leave screen
      if (b.x < 0 || b.y < 0 || b.x > w || b.y > h) {
        bullets.splice(i, 1);
      }
    }
  }

function collectCoins() {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    if (Math.hypot(player.x - c.x, player.y - c.y) < c.size + 20) {
      coins.splice(i, 1);
      score += c.value; 
      totalCoins += c.value;
      localStorage.setItem('totalCoins', totalCoins.toString());
    }
  }
}



//  I asked for help setting some vectors for the sprites, and now i can't get rid of it. Thx javascript
const enemySprites = {
  normal: (() => {
    const img = new Image();
    img.src = 'img/sprite/enemy_normal.png';
    img.onerror = function() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 48;
      tempCanvas.height = 48;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = 'red';
      tempCtx.beginPath();
      tempCtx.arc(24, 24, 24, 0, Math.PI * 2);
      tempCtx.fill();
      return tempCanvas;
    };
    return img;
  })(),
  shooter: (() => {
    const img = new Image();
    img.src = 'img/sprite/enemy_shooter.png';
    img.onerror = function() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 48;
      tempCanvas.height = 48;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = 'blue';
      tempCtx.beginPath();
      tempCtx.arc(24, 24, 22, 0, Math.PI * 2);
      tempCtx.fill();
      return tempCanvas;
    };
    return img;
  })(),
  thief: (() => {
    const img = new Image();
    img.src = 'img/sprite/enemy_thief.png';
    img.onerror = function() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 48;
      tempCanvas.height = 48;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = 'purple';
      tempCtx.beginPath();
      tempCtx.arc(24, 24, 22, 0, Math.PI * 2);
      tempCtx.fill();
      return tempCanvas;
    };
    return img;
  })()
};


function resetGameState() {
  enemies.length = 0;
  coins.length = 0;
  bullets.length = 0;
  resetArmor();

  score = 0;

  player.x = w / 2;
  player.y = h / 2;
  player.vx = 0;
  player.vy = 0;
  player.angle = 0;
  document.getElementById('score').textContent = score;
}


function draw() {
  ctx.clearRect(0, 0, w, h);
  
  // coins
  for (const c of coins) {
    const sprite = coinSprites[c.type];
    const drawSize = c.size * 2;
    ctx.drawImage(sprite, c.x - drawSize/2, c.y - drawSize/2, drawSize, drawSize);
  }
  
  // bullets
  for (const b of bullets) {
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // enemies
  for (const e of enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    
    const enemyAngle = Math.atan2(e.vy, e.vx);

    ctx.rotate(enemyAngle);
    
    const enemySprite = enemySprites[Object.keys(enemyTypes).find(key => enemyTypes[key].color === e.color)];
    if (enemySprite && enemySprite.complete && enemySprite.naturalWidth !== 0) {
      ctx.drawImage(enemySprite, -24, -24, 48, 48);
    } else {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(0, 0, e.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(e.size, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  
  ctx.save();
ctx.translate(player.x, player.y);

const sprite = playerSprites[player.currentDirection];
if (sprite && (sprite instanceof HTMLCanvasElement || (sprite.complete && sprite.naturalWidth > 0))) {
    ctx.drawImage(sprite, -24, -24, 48, 48);
} else {
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(24 * Math.cos(player.angle), 24 * Math.sin(player.angle));
    ctx.stroke();
}

ctx.restore();
}

  document.getElementById('bestScore').textContent = bestScore;

  let lastTime;
  let gameActive = false;

  function gameLoop(now) {
    if (document.getElementById('activeGame').classList.contains('active-screen')) {
      if (!gameActive) {
        gameActive = true;
        lastTime = now;
        requestAnimationFrame(gameLoop);
        return;
      }
      
      // this somehow calculates delta, but i'll take it
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      
      handleInput(dt);
      updateEnemies(dt, now);
      updateBullets(dt);
      collectCoins();
      
      if (now - lastCoinTime > coinSpawnRate * 1000) {
        spawnCoin();
        lastCoinTime = now;
      }
      
      if (now - lastEnemyTime > enemySpawnRate * 1000) {
        spawnEnemy();
        lastEnemyTime = now;
      }
      
      draw();
      
      document.getElementById('score').textContent = score;
      document.getElementById('bestScore').textContent = bestScore;
    } else {
      gameActive = false;
    }
    
    requestAnimationFrame(gameLoop);
  }
  loadUpgrades();
  requestAnimationFrame(gameLoop);

  document.querySelector('button[onclick="showScreen(\'activeGame\')"]').addEventListener('click', () => {
    player.x = w / 2;
    player.y = h / 2;
    player.vx = 0;
    player.vy = 0;
    player.angle = 0;
  });