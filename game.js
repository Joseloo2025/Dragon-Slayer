// game.js
// ========== CONFIGURACIÓN INICIAL ========== //
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let map = [];
const debugInfo = document.getElementById('debug-info');

// Variables de estado del juego
let gameCompleted = false;
let disableControls = false;
const tileSize = 64;

// ========== SISTEMA DE COMBATE ========== //
const combatSystem = {
    getCriticalMultiplier: function(entity) {
        const baseChance = entity === player ? 0.15 : 0.05;
        const criticalRoll = Math.random();
        return criticalRoll < baseChance ? 2 : 1;
    },
    
    applyDamage: function(attacker, defender, baseDamage) {
        const critMulti = this.getCriticalMultiplier(attacker);
        const damage = Math.floor(baseDamage * critMulti);
        
        defender.health -= damage;
        
        effects.addFloatingText(
            defender.x,
            defender.y - 50,
            `${damage}${critMulti > 1 ? "!" : ""}`,
            critMulti > 1 ? "#FF0" : "#F00",
            1000,
            critMulti > 1 ? 22 : 18
        );
        
        if (critMulti > 1) {
            effects.add(defender.x, defender.y, "rgba(255, 255, 0, 0.7)", 40, 500);
        }
        
        particles.addExplosion(defender.x, defender.y, critMulti > 1 ? "#FF8C00" : "#F00");
        
        return damage;
    }
};

// ========== SISTEMA DE PARTICIONADO ESPACIAL ========== //
const spatialGrid = {
    cellSize: 128,
    grid: {},
    
    clear: function() {
        this.grid = {};
    },
    
    getCellKey: function(x, y) {
        return `${Math.floor(x/this.cellSize)},${Math.floor(y/this.cellSize)}`;
    },
    
    insert: function(entity) {
        if (!entity || isNaN(entity.x) || isNaN(entity.y)) return;
        const key = this.getCellKey(entity.x, entity.y);
        if (!this.grid[key]) this.grid[key] = [];
        this.grid[key].push(entity);
    },
    
    getNearby: function(x, y, radius) {
        if (isNaN(x) || isNaN(y)) return [];
        const result = [];
        const minX = Math.floor((x - radius) / this.cellSize);
        const maxX = Math.floor((x + radius) / this.cellSize);
        const minY = Math.floor((y - radius) / this.cellSize);
        const maxY = Math.floor((y + radius) / this.cellSize);
        
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const key = `${cx},${cy}`;
                if (this.grid[key]) {
                    result.push(...this.grid[key].filter(e => e && !isNaN(e.x) && !isNaN(e.y)));
                }
            }
        }
        return result;
    }
};

// ========== CÁMARA ========== //
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    update: function() {
        this.x = player.x - this.width / 2;
        this.y = player.y - this.height / 2;
        
        if (map && map.length > 0 && map[0].length > 0) {
            this.x = Math.max(0, Math.min(map[0].length * tileSize - this.width, this.x));
            this.y = Math.max(0, Math.min(map.length * tileSize - this.height, this.y));
        }
    }
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.width = canvas.width;
    camera.height = canvas.height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let DEBUG_MODE = false;
let lastDebugUpdate = 0;

// ========== SISTEMA DE SPRITES ========== //
const sprites = {
    playerRight: new Image(),
    playerLeft: new Image(),
    playerUp: new Image(),
    playerDown: new Image(),
    
    goblin: new Image(),
    hobgoblin: new Image(),
    goblinShaman: new Image(),
    bugbear: new Image(),
    eliteGoblin: new Image(),
    
    bossGoblin: new Image(),
    bossHobgoblin: new Image(),
    bossShaman: new Image(),
    bossGoblinKing: new Image(),
    bossGoblinLord: new Image(),
    
    floorForest: new Image(),
    floorCave: new Image(),
    floorRuins: new Image(),
    floorFortress: new Image(),
    floorThrone: new Image(),
    
    wallForest: new Image(),
    wallCave: new Image(),
    wallRuins: new Image(),
    wallFortress: new Image(),
    wallThrone: new Image(),
    
    floorTile: new Image(),
    wallTile: new Image(),
    
    eventTile: new Image(),
    potion: new Image(),
    fireballRight: new Image(),
    fireballLeft: new Image(),
    fireballUp: new Image(),
    fireballDown: new Image(),
    quickSlashRight: new Image(),
    quickSlashLeft: new Image(),
    quickSlashUp: new Image(),
    quickSlashDown: new Image(),
    shieldEffect: new Image()
};

function loadSprite(sprite, path) {
    return new Promise((resolve, reject) => {
        sprite.onload = () => resolve(sprite);
        sprite.onerror = () => {
            console.error(`Error al cargar sprite: ${path}`);
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#F00';
            ctx.fillRect(0, 0, 64, 64);
            sprite.src = canvas.toDataURL();
            resolve(sprite);
        };
        sprite.src = path;
    });
}

Promise.all([
    loadSprite(sprites.playerRight, "assets/sprites/player/right.png"),
    loadSprite(sprites.playerLeft, "assets/sprites/player/left.png"),
    loadSprite(sprites.playerUp, "assets/sprites/player/up.png"),
    loadSprite(sprites.playerDown, "assets/sprites/player/down.png"),
    
    loadSprite(sprites.goblin, "assets/sprites/enemies/goblin.png"),
    loadSprite(sprites.hobgoblin, "assets/sprites/enemies/hobgoblin.png"),
    loadSprite(sprites.goblinShaman, "assets/sprites/enemies/shaman.png"),
    loadSprite(sprites.bugbear, "assets/sprites/enemies/bugbear.png"),
    loadSprite(sprites.eliteGoblin, "assets/sprites/enemies/elite.png"),
    
    loadSprite(sprites.bossGoblin, "assets/sprites/bosses/goblin.png"),
    loadSprite(sprites.bossHobgoblin, "assets/sprites/bosses/hobgoblin.png"),
    loadSprite(sprites.bossShaman, "assets/sprites/bosses/shaman.png"),
    loadSprite(sprites.bossGoblinKing, "assets/sprites/bosses/king.png"),
    loadSprite(sprites.bossGoblinLord, "assets/sprites/bosses/lord.png"),
    
    loadSprite(sprites.floorForest, "assets/sprites/tiles/floor-forest.png"),
    loadSprite(sprites.floorCave, "assets/sprites/tiles/floor-cave.png"),
    loadSprite(sprites.floorRuins, "assets/sprites/tiles/floor-ruins.png"),
    loadSprite(sprites.floorFortress, "assets/sprites/tiles/floor-fortress.png"),
    loadSprite(sprites.floorThrone, "assets/sprites/tiles/floor-throne.png"),
    
    loadSprite(sprites.wallForest, "assets/sprites/tiles/wall-forest.png"),
    loadSprite(sprites.wallCave, "assets/sprites/tiles/wall-cave.png"),
    loadSprite(sprites.wallRuins, "assets/sprites/tiles/wall-ruins.png"),
    loadSprite(sprites.wallFortress, "assets/sprites/tiles/wall-fortress.png"),
    loadSprite(sprites.wallThrone, "assets/sprites/tiles/wall-throne.png"),
    
    loadSprite(sprites.floorTile, "assets/sprites/tiles/floor.png"),
    loadSprite(sprites.wallTile, "assets/sprites/tiles/wall.png"),
    
    loadSprite(sprites.eventTile, "assets/sprites/tiles/event.png"),
    loadSprite(sprites.potion, "assets/sprites/items/potion.png"),
    loadSprite(sprites.fireballRight, "assets/sprites/effects/fireball-right.png"),
    loadSprite(sprites.fireballLeft, "assets/sprites/effects/fireball-left.png"),
    loadSprite(sprites.fireballUp, "assets/sprites/effects/fireball-up.png"),
    loadSprite(sprites.fireballDown, "assets/sprites/effects/fireball-down.png"),
    loadSprite(sprites.quickSlashRight, "assets/sprites/effects/quick-slash-right.png"),
    loadSprite(sprites.quickSlashLeft, "assets/sprites/effects/quick-slash-left.png"),
    loadSprite(sprites.quickSlashUp, "assets/sprites/effects/quick-slash-up.png"),
    loadSprite(sprites.quickSlashDown, "assets/sprites/effects/quick-slash-down.png"),
    loadSprite(sprites.shieldEffect, "assets/sprites/effects/shield.png")
]).then(() => {
    console.log("Sprites cargados");
    initBossAbilities();
    initGame();
});

// ========== JUGADOR ========== //
const player = {
    x: 400,
    y: 300,
    width: 64,
    height: 64,
    speed: 5,
    health: 100,
    maxHealth: 100,
    baseAttack: 15,
    originalAttack: 15,
    direction: { x: 0, y: 1 },
    isShielded: false,
    lastHitTime: 0,
    
    get attack() {
        return this.baseAttack;
    },
    
    getCurrentSprite: function() {
        if (Math.abs(this.direction.x) > Math.abs(this.direction.y)) {
            return this.direction.x > 0 ? sprites.playerRight : sprites.playerLeft;
        } else {
            return this.direction.y > 0 ? sprites.playerDown : sprites.playerUp;
        }
    },
    
    draw: function() {
        const currentSprite = this.getCurrentSprite();
        
        if (currentSprite.complete) {
            ctx.drawImage(
                currentSprite,
                this.x - camera.x - this.width/2,
                this.y - camera.y - this.height/2,
                this.width,
                this.height
            );
        } else {
            ctx.fillStyle = "#00F";
            ctx.fillRect(
                this.x - camera.x - this.width/2,
                this.y - camera.y - this.height/2,
                this.width,
                this.height
            );
        }

        if (this.isShielded) {
            ctx.strokeStyle = "rgba(100, 100, 255, 0.7)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
                this.x - camera.x,
                this.y - camera.y,
                this.width/2 + 5,
                0,
                Math.PI * 2
            );
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        if (DEBUG_MODE) {
            ctx.strokeStyle = "rgba(0, 0, 255, 0.5)";
            ctx.strokeRect(
                this.x - camera.x - this.width/2,
                this.y - camera.y - this.height/2,
                this.width,
                this.height
            );
        }
    }
};

// ========== FUNCIÓN PARA ENCONTRAR POSICIÓN SEGURA ========== //
function findSafeSpawnPosition(desiredX, desiredY) {
    if (!map || map.length === 0) return { x: desiredX, y: desiredY };
    
    // Buscar en un radio alrededor de la posición deseada
    const searchRadius = 5; // Radio en tiles
    const centerTileX = Math.floor(desiredX / tileSize);
    const centerTileY = Math.floor(desiredY / tileSize);
    
    // Buscar en círculos concéntricos alrededor del punto deseado
    for (let r = 0; r <= searchRadius; r++) {
        for (let x = centerTileX - r; x <= centerTileX + r; x++) {
            for (let y = centerTileY - r; y <= centerTileY + r; y++) {
                // Solo verificar los bordes del círculo actual
                if (Math.abs(x - centerTileX) === r || Math.abs(y - centerTileY) === r) {
                    // Verificar que las coordenadas estén dentro del mapa
                    if (x >= 0 && x < map[0].length && y >= 0 && y < map.length) {
                        // Verificar que sea un tile de suelo y no haya colisiones
                        if (map[y][x] === 1) {
                            const spawnX = x * tileSize + tileSize/2;
                            const spawnY = y * tileSize + tileSize/2;
                            
                            // Verificar colisión en la posición propuesta
                            if (!checkCollision(spawnX, spawnY, player.width, player.height)) {
                                return { x: spawnX, y: spawnY };
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Si no se encuentra ninguna posición segura, devolver la posición deseada como último recurso
    return { x: desiredX, y: desiredY };
}

// ========== MAPA Y COLISIONES ========== //
function checkCollision(x, y, entityWidth = 0, entityHeight = 0) {
    if (isNaN(x) || isNaN(y)) return true;
    
    if (!map || map.length === 0 || !map[0]) return true;
    
    const tileX = Math.floor(x / tileSize);
    const tileY = Math.floor(y / tileSize);
    
    if (tileX < 0 || tileY < 0 || tileX >= map[0].length || tileY >= map.length) {
        return true;
    }
    
    if (missions.checkBossDoor(x, y)) {
        return true;
    }
    
    if (map[tileY][tileX] === 2) {
        return true;
    }
    
    if (entityWidth > 0 || entityHeight > 0) {
        const checkPoints = [
            {x: x - entityWidth/2, y: y - entityHeight/2},
            {x: x + entityWidth/2, y: y - entityHeight/2},
            {x: x - entityWidth/2, y: y + entityHeight/2},
            {x: x + entityWidth/2, y: y + entityHeight/2}
        ];
        
        return checkPoints.some(point => {
            const tx = Math.floor(point.x / tileSize);
            const ty = Math.floor(point.y / tileSize);
            return tx < 0 || ty < 0 || tx >= map[0].length || ty >= map.length || map[ty][tx] === 2;
        });
    }
    
    return false;
}

function drawMap() {
    if (!map || map.length === 0 || !map[0]) return;
    
    const startX = Math.floor(camera.x / tileSize);
    const startY = Math.floor(camera.y / tileSize);
    const endX = Math.min(startX + Math.ceil(camera.width / tileSize) + 1, map[0].length);
    const endY = Math.min(startY + Math.ceil(camera.height / tileSize) + 1, map.length);
    
    const zonaActual = zonas.zonas[zonas.zonaActual];
    if (!zonaActual) return;
    
    let floorSprite, wallSprite;
    
    switch(zonaActual.nombre) {
        case "Bosque de los Goblins":
            floorSprite = sprites.floorForest;
            wallSprite = sprites.wallForest;
            break;
        case "Cueva de los Hobgoblins":
            floorSprite = sprites.floorCave;
            wallSprite = sprites.wallCave;
            break;
        case "Ruinas del Goblin Shaman":
            floorSprite = sprites.floorRuins;
            wallSprite = sprites.wallRuins;
            break;
        case "Fortaleza de los Goblinoides":
            floorSprite = sprites.floorFortress;
            wallSprite = sprites.wallFortress;
            break;
        case "Trono del Señor Goblin":
            floorSprite = sprites.floorThrone;
            wallSprite = sprites.wallThrone;
            break;
        default:
            floorSprite = sprites.floorTile;
            wallSprite = sprites.wallTile;
    }
    
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const tile = map[y][x];
            const drawX = x * tileSize - camera.x;
            const drawY = y * tileSize - camera.y;
            
            if (x === 10 && y === 8 && missions.bossDoorLocked) {
                missions.drawBossDoor();
                continue;
            }
            
            switch(tile) {
                case 1:
                    if (floorSprite.complete) {
                        ctx.drawImage(floorSprite, drawX, drawY, tileSize, tileSize);
                    } else {
                        ctx.fillStyle = zonaActual.colorFondo;
                        ctx.fillRect(drawX, drawY, tileSize, tileSize);
                    }
                    break;
                case 2:
                    if (wallSprite.complete) {
                        ctx.drawImage(wallSprite, drawX, drawY, tileSize, tileSize);
                    } else {
                        ctx.fillStyle = "#000";
                        ctx.fillRect(drawX, drawY, tileSize, tileSize);
                    }
                    break;
                case 3:
                    if (sprites.eventTile.complete) {
                        ctx.drawImage(sprites.eventTile, drawX, drawY, tileSize, tileSize);
                    } else {
                        ctx.fillStyle = "#FF0";
                        ctx.fillRect(drawX, drawY, tileSize, tileSize);
                    }
                    break;
            }

            if (DEBUG_MODE) {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
                ctx.strokeRect(drawX, drawY, tileSize, tileSize);
            }
        }
    }
}

// ========== MONSTRUOS ========== //
const monsters = [];
let bossSpawned = false;

function initBossAbilities() {
    const bossAbilities = {
        "Goblin Jefe": function() {
            effects.add(this.x, this.y, "rgba(255, 100, 0, 0.7)", 50, 1000);
            this.speed *= 2;
            setTimeout(() => { this.speed /= 2; }, 2000);
            missions.showNotification("¡Carga Feroz!", "El Goblin Jefe carga a gran velocidad");
        },
        "Hobgoblin Anciano": function() {
            spawnMonsters(3);
            effects.add(this.x, this.y, "rgba(0, 255, 0, 0.7)", 60, 800);
            missions.showNotification("¡Refuerzos!", "El Hobgoblin Anciano llama a sus secuaces");
        },
        "Gran Shaman Goblin": function() {
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const angle = Math.PI * 2 * (i / 8);
                    effects.addProjectile(
                        this.x, this.y,
                        Math.cos(angle), Math.sin(angle),
                        4, 15, 200, 1.2
                    );
                }, i * 200);
            }
            missions.showNotification("¡Tormenta de Fuego!", "El Shaman lanza bolas de fuego en todas direcciones");
        },
        "Rey Goblin": function() {
            effects.add(this.x, this.y, "rgba(150, 75, 0, 0.7)", 80, 1200);
            const nearby = spatialGrid.getNearby(player.x, player.y, 150);
            nearby.forEach(ent => {
                if (ent === player && !player.isShielded) {
                    combatSystem.applyDamage(this, player, 20);
                }
            });
            missions.showNotification("¡Golpe de Tierra!", "El Rey Goblin sacude el suelo");
        },
        "Señor Goblin": function() {
            effects.add(this.x, this.y, "rgba(100, 0, 100, 0.9)", 100, 1500);
            this.health = Math.min(this.maxHealth, this.health + 50);
            this.attack *= 1.5;
            setTimeout(() => { this.attack /= 1.5; }, 3000);
            missions.showNotification("¡Ira Oscura!", "El Señor Goblin absorbe energía y se fortalece");
        }
    };

    zonas.zonas.forEach(zona => {
        if (zona.jefe && bossAbilities[zona.jefe]) {
            zona.bossAbility = bossAbilities[zona.jefe];
        }
    });
}

function spawnMonsters(count, isBoss = false) {
    if (!map || map.length === 0 || !map[0]) {
        console.error("No se puede generar monstruos: mapa no inicializado");
        return;
    }
    
    const zona = zonas.zonaActual;
    if (zona === undefined || !zonas.zonas[zona]) return;
    
    for (let i = 0; i < count; i++) {
        let x, y;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 100;
        const margin = 32;
        
        do {
            if (isBoss) {
                x = 10 * tileSize;
                y = 10 * tileSize;
                validPosition = true;
            } else {
                const angle = Math.random() * Math.PI * 2;
                const distance = 300 + Math.random() * 200;
                x = player.x + Math.cos(angle) * distance;
                y = player.y + Math.sin(angle) * distance;
                
                x = Math.max(tileSize, Math.min((map[0].length - 1) * tileSize, x));
                y = Math.max(tileSize, Math.min((map.length - 1) * tileSize, y));
                
                const tileX = Math.floor(x / tileSize);
                const tileY = Math.floor(y / tileSize);
                const isInBossRoom = (tileX >= 9 && tileX <= 11 && tileY >= 9 && tileY <= 11);
                const isInSafeZone = (tileX >= 1 && tileX <= 3 && tileY >= 1 && tileY <= 3);
                
                validPosition = !isInBossRoom && !isInSafeZone && map[tileY][tileX] === 1;
                
                if (validPosition) {
                    let attemptsToFindGoodPosition = 0;
                    while (attemptsToFindGoodPosition < 10 && 
                           (checkCollision(x, y) || 
                            checkCollision(x + margin, y) ||
                            checkCollision(x - margin, y) ||
                            checkCollision(x, y + margin) ||
                            checkCollision(x, y - margin))) {
                        x = Math.random() * (map[0].length - 2) * tileSize + tileSize;
                        y = Math.random() * (map.length - 2) * tileSize + tileSize;
                        attemptsToFindGoodPosition++;
                    }
                }
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
                console.log("No se pudo encontrar posición válida para el monstruo");
                break;
            }
        } while (!validPosition);
        
        if (!validPosition) continue;
        
        let tipoEnemigo;
        if (isBoss) {
            tipoEnemigo = zonas.zonas[zonas.zonaActual].jefe;
        } else {
            const enemigosZona = zonas.zonas[zonas.zonaActual].enemigos;
            tipoEnemigo = enemigosZona[Math.floor(Math.random() * enemigosZona.length)];
        }
        
        let saludBase, ataqueBase, velocidadBase, tamañoBase;
        switch(tipoEnemigo) {
            case "Hobgoblin":
                saludBase = 50 + zonas.zonaActual * 10;
                ataqueBase = 10 + zonas.zonaActual * 2;
                velocidadBase = 1.8;
                tamañoBase = 70;
                break;
            case "Goblin Shaman":
                saludBase = 40 + zonas.zonaActual * 8;
                ataqueBase = 15 + zonas.zonaActual * 3;
                velocidadBase = 1.5;
                tamañoBase = 60;
                break;
            case "Bugbear":
                saludBase = 80 + zonas.zonaActual * 15;
                ataqueBase = 20 + zonas.zonaActual * 3;
                velocidadBase = 1.3;
                tamañoBase = 90;
                break;
            case "Elite Goblin":
                saludBase = 60 + zonas.zonaActual * 12;
                ataqueBase = 18 + zonas.zonaActual * 3;
                velocidadBase = 2.0;
                tamañoBase = 65;
                break;
            default:
                saludBase = 30 + zonas.zonaActual * 5;
                ataqueBase = 5 + zonas.zonaActual;
                velocidadBase = 2.0;
                tamañoBase = 64;
        }
        
        const monster = {
            x: x,
            y: y,
            width: isBoss ? 90 : tamañoBase,
            height: isBoss ? 90 : tamañoBase,
            health: isBoss ? 150 + zonas.zonaActual * 30 : saludBase,
            maxHealth: isBoss ? 150 + zonas.zonaActual * 30 : saludBase,
            attack: isBoss ? 15 + zonas.zonaActual * 3 : ataqueBase,
            speed: isBoss ? 1.5 : velocidadBase,
            isBoss: isBoss,
            name: isBoss ? zonas.zonas[zonas.zonaActual].jefe : tipoEnemigo,
            tipo: tipoEnemigo,
            direction: { x: 0, y: 0 },
            lastHit: 0,
            currentState: "idle",
            stateTimer: 0,
            isStunned: false,
            specialAbility: isBoss ? zonas.zonas[zonas.zonaActual].bossAbility : null,
            abilityCooldown: 0,
            
            update: function(deltaTime) {
                const oldX = this.x;
                const oldY = this.y;
                const speed = this.speed * (deltaTime / 16);
                
                if (this.isBoss) {
                    this.stateTimer -= deltaTime;
                    
                    switch(this.currentState) {
                        case "idle":
                            if (this.stateTimer <= 0) {
                                this.currentState = "chase";
                                this.stateTimer = 3000 + Math.random() * 2000;
                            }
                            break;
                            
                        case "chase":
                            const dx = player.x - this.x;
                            const dy = player.y - this.y;
                            const distance = Math.hypot(dx, dy);
                            
                            if (distance > 0) {
                                this.x += (dx / distance) * speed;
                                this.y += (dy / distance) * speed;
                            }
                            
                            if (this.stateTimer <= 0) {
                                this.currentState = "special";
                                this.stateTimer = 2000;
                            }
                            break;
                            
                        case "special":
                            if (this.specialAbility) {
                                this.specialAbility.call(this);
                            }
                            this.currentState = "recover";
                            this.stateTimer = 1000;
                            break;
                            
                        case "recover":
                            if (this.stateTimer <= 0) {
                                this.currentState = "chase";
                                this.stateTimer = 4000 + Math.random() * 3000;
                            }
                            break;
                    }
                } else {
                    const dx = player.x - this.x;
                    const dy = player.y - this.y;
                    const distance = Math.hypot(dx, dy);
                    
                    if (distance > 0) {
                        this.x += (dx / distance) * speed;
                        this.y += (dy / distance) * speed;
                    }
                }
                
                // Verificar colisión después del movimiento
                if (checkCollision(this.x, this.y, this.width, this.height)) {
                    // Si hay colisión, revertir a la posición anterior
                    this.x = oldX;
                    this.y = oldY;
                    
                    // Intentar moverse solo en X o solo en Y
                    const tryX = {x: this.x + (player.x - this.x > 0 ? speed : -speed), y: oldY};
                    const tryY = {x: oldX, y: this.y + (player.y - this.y > 0 ? speed : -speed)};
                    
                    if (!checkCollision(tryX.x, tryX.y, this.width, this.height)) {
                        this.x = tryX.x;
                    } else if (!checkCollision(tryY.x, tryY.y, this.width, this.height)) {
                        this.y = tryY.y;
                    }
                }
                
                if (this.abilityCooldown > 0) {
                    this.abilityCooldown -= deltaTime;
                }
            },
            
            getCurrentSprite: function() {
                if (this.isBoss) {
                    switch(zonas.zonaActual) {
                        case 0: return sprites.bossGoblin;
                        case 1: return sprites.bossHobgoblin;
                        case 2: return sprites.bossShaman;
                        case 3: return sprites.bossGoblinKing;
                        case 4: return sprites.bossGoblinLord;
                        default: return sprites.bossGoblin;
                    }
                } else {
                    switch(this.tipo) {
                        case "Hobgoblin": return sprites.hobgoblin;
                        case "Goblin Shaman": return sprites.goblinShaman;
                        case "Bugbear": return sprites.bugbear;
                        case "Elite Goblin": return sprites.eliteGoblin;
                        default: return sprites.goblin;
                    }
                }
            },
            
            draw: function() {
                const spriteToUse = this.getCurrentSprite();
                
                if (spriteToUse.complete) {
                    ctx.drawImage(
                        spriteToUse,
                        this.x - camera.x - this.width/2,
                        this.y - camera.y - this.height/2,
                        this.width,
                        this.height
                    );
                } else {
                    ctx.fillStyle = this.isBoss ? "#8B0000" : "#F00";
                    ctx.fillRect(
                        this.x - camera.x - this.width/2,
                        this.y - camera.y - this.height/2,
                        this.width,
                        this.height
                    );
                }
                
                const healthPercent = this.health / this.maxHealth;
                ctx.fillStyle = this.isBoss ? "#FF0" : "#F00";
                ctx.fillRect(
                    this.x - camera.x - this.width/2,
                    this.y - camera.y - this.height/2 - 25,
                    this.width * healthPercent,
                    8
                );
                ctx.strokeStyle = "#000";
                ctx.strokeRect(
                    this.x - camera.x - this.width/2,
                    this.y - camera.y - this.height/2 - 25,
                    this.width,
                    8
                );
                
                ctx.fillStyle = this.isBoss ? "#FF0" : "#FFF";
                ctx.font = this.isBoss ? "bold 14px Arial" : "12px Arial";
                ctx.textAlign = "center";
                ctx.fillText(
                    this.name,
                    this.x - camera.x,
                    this.y - camera.y - this.height/2 - 30
                );
                ctx.textAlign = "left";

                if (DEBUG_MODE) {
                    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
                    ctx.strokeRect(
                        this.x - camera.x - this.width/2,
                        this.y - camera.y - this.height/2,
                        this.width,
                        this.height
                    );
                }
            }
        };
        
        monsters.push(monster);
        spatialGrid.insert(monster);
        
        if (isBoss) {
            bossSpawned = true;
        }
    }
}

function isInBossRoom() {
    const tileX = Math.floor(player.x / tileSize);
    const tileY = Math.floor(player.y / tileSize);
    return tileX >= 9 && tileX <= 11 && tileY >= 9 && tileY <= 11;
}

// ========== SISTEMA DE COMBATE ========== //
function checkCombat(deltaTime) {
    const nearbyMonsters = spatialGrid.getNearby(player.x, player.y, 300);
    
    nearbyMonsters.forEach((monster) => {
        if (!monster || typeof monster.update !== 'function') return;
        
        monster.update(deltaTime);
        
        const dx = player.x - monster.x;
        const dy = player.y - monster.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < 40) {
            const now = Date.now();
            if (!monster.lastHit || now - monster.lastHit > 1000) {
                if (!player.isShielded) {
                    combatSystem.applyDamage(monster, player, monster.attack * 0.5);
                    monster.lastHit = now;
                    
                    effects.add(player.x, player.y, "rgba(255, 0, 0, 0.7)", 30, 200);
                }
            }
            
            if (player.health <= 0) {
                if (zonas.zonaActual === 4 && player.baseAttack > player.originalAttack) {
                    player.baseAttack = player.originalAttack;
                }
                
                player.health = player.maxHealth;
                // Encontrar posición segura para respawn
                const safeSpawn = findSafeSpawnPosition(2 * tileSize + tileSize/2, 2 * tileSize + tileSize/2);
                player.x = safeSpawn.x;
                player.y = safeSpawn.y;
                
                monsters.length = 0;
                spawnMonsters(5 + zonas.zonaActual * 2);
                bossSpawned = false;
            }
        }
        
        if (monster.health <= 0) {
            zonas.actualizarProgresoMision(monster.tipo, monster.isBoss);
            const index = monsters.indexOf(monster);
            if (index !== -1) monsters.splice(index, 1);
            
            if (monster.isBoss) {
                addItem("potion");
                addItem("potion");
                addItem("potion");
                
                if (zonas.zonaActual < zonas.zonas.length - 1) {
                    setTimeout(() => {
                        zonas.avanzarZona();
                        // Teletransportar a zona segura
                        const safeSpawn = findSafeSpawnPosition(2 * tileSize + tileSize/2, 2 * tileSize + tileSize/2);
                        player.x = safeSpawn.x;
                        player.y = safeSpawn.y;
                    }, 5000);
                }
            } else {
                if (zonas.zonaActual !== 4 && !isInBossRoom() && !bossSpawned && missions.bossDoorLocked) {
                    if (monsters.length < 3 + zonas.zonaActual) {
                        spawnMonsters(3 + zonas.zonaActual - monsters.length);
                    }
                }
            }
        }
    });
    
    for (let i = monsters.length - 1; i >= 0; i--) {
        if (!monsters[i] || typeof monsters[i].update !== 'function') {
            monsters.splice(i, 1);
        }
    }
    
    if (isInBossRoom() && !bossSpawned && monsters.length === 0 && !missions.bossDoorLocked) {
        spawnMonsters(1, true);
    }
}

// ========== ATAQUE BÁSICO ========== //
const basicAttack = {
    cooldown: 500,
    lastUsed: 0,
    range: 15,
    damage: 15,
    isReady: function() {
        return Date.now() - this.lastUsed > this.cooldown;
    },
    use: function() {
        if (!this.isReady()) return;
        this.lastUsed = Date.now();
        
        const attackX = player.x + player.direction.x * this.range;
        const attackY = player.y + player.direction.y * this.range;
        
        const nearbyMonsters = spatialGrid.getNearby(attackX, attackY, 60);
        nearbyMonsters.forEach(monster => {
            if (!monster || typeof monster.update !== 'function') return;
            
            const distance = Math.hypot(monster.x - attackX, monster.y - attackY);
            if (distance < 60) {
                combatSystem.applyDamage(player, monster, this.damage);
                
                effects.add(
                    monster.x,
                    monster.y,
                    "rgba(255, 0, 0, 0.7)",
                    30,
                    200
                );
            }
        });
        
        effects.add(
            attackX,
            attackY,
            "rgba(255, 255, 0, 0.7)",
            30,
            200
        );
    }
};

// ========== SISTEMA DE EFECTOS ========== //
const effects = {
    list: [],
    projectiles: [],
    add: function(x, y, color, radius, duration) {
        this.list.push({
            x: x,
            y: y,
            color: color,
            radius: radius,
            startTime: Date.now(),
            duration: duration,
            type: "effect"
        });
    },
    addFloatingText: function(x, y, text, color, duration, size = 18) {
        this.list.push({
            x: x,
            y: y,
            text: text,
            color: color,
            startTime: Date.now(),
            duration: duration,
            type: "text",
            size: size,
            velocity: -0.5
        });
    },
    addSkillEffect: function(x, y, type, direction) {
        let sprite, size, duration;
        
        switch(type) {
            case "fireball":
                sprite = direction === 'right' ? sprites.fireballRight :
                         direction === 'left' ? sprites.fireballLeft :
                         direction === 'up' ? sprites.fireballUp : sprites.fireballDown;
                size = 0.09;
                duration = 800;
                break;
            case "quickSlash":
                sprite = direction === 'right' ? sprites.quickSlashRight :
                         direction === 'left' ? sprites.quickSlashLeft :
                         direction === 'up' ? sprites.quickSlashUp : sprites.quickSlashDown;
                size = 0.09;
                duration = 500;
                break;
            case "shield":
                sprite = sprites.shieldEffect;
                size = 0.2;
                duration = 3000;
                break;
        }
        
        this.list.push({
            x: x,
            y: y,
            type: "skill",
            sprite: sprite,
            size: size,
            startTime: Date.now(),
            duration: duration,
            direction: direction
        });
    },
    addProjectile: function(x, y, dx, dy, speed, damage, range, size = 1.0) {
        let fireballSprite;
        if (Math.abs(dx) > Math.abs(dy)) {
            fireballSprite = dx > 0 ? sprites.fireballRight : sprites.fireballLeft;
        } else {
            fireballSprite = dy > 0 ? sprites.fireballDown : sprites.fireballUp;
        }

        // Ajustar la posición inicial para que no esté exactamente en el jugador
        const offset = 30; // Distancia desde el jugador
        const startX = x + dx * offset;
        const startY = y + dy * offset;

        this.projectiles.push({
            x: startX,
            y: startY,
            dx: dx,
            dy: dy,
            speed: speed,
            damage: damage,
            range: range,
            distance: offset, // Empezar con distancia inicial
            sprite: fireballSprite,
            size: size,
            width: 32 * size,
            height: 32 * size
        });
    },
    update: function() {
        const now = Date.now();
        this.list = this.list.filter(effect => {
            return (now - effect.startTime) < effect.duration;
        });
        
        this.projectiles = this.projectiles.filter(proj => {
            proj.x += proj.dx * proj.speed;
            proj.y += proj.dy * proj.speed;
            proj.distance += proj.speed;
            
            if (checkCollision(proj.x, proj.y)) {
                return false;
            }
            
            let hit = false;
            const nearbyMonsters = spatialGrid.getNearby(proj.x, proj.y, 30);
            nearbyMonsters.forEach(monster => {
                if (!monster || typeof monster.update !== 'function') return;
                
                const dist = Math.hypot(monster.x - proj.x, monster.y - proj.y);
                if (dist < 30) {
                    combatSystem.applyDamage(player, monster, proj.damage);
                    hit = true;
                }
            });
            
            if (!hit && Math.hypot(player.x - proj.x, player.y - proj.y) < 30 && !player.isShielded) {
                combatSystem.applyDamage({attack: proj.damage}, player, proj.damage);
                hit = true;
            }
            
            return !hit && proj.distance < proj.range;
        });
    },
    draw: function() {
        this.list.forEach(effect => {
            const progress = (Date.now() - effect.startTime) / effect.duration;
            ctx.globalAlpha = 1 - progress;
            
            if (effect.type === "text") {
                ctx.fillStyle = effect.color;
                ctx.font = `bold ${effect.size}px Arial`;
                ctx.textAlign = "center";
                ctx.fillText(
                    effect.text,
                    effect.x - camera.x,
                    effect.y - camera.y + (effect.velocity * progress * 100)
                );
                ctx.textAlign = "left";
            } else if (effect.type === "skill" && effect.sprite.complete) {
                const drawX = effect.x - camera.x - (effect.sprite.width * effect.size)/2;
                const drawY = effect.y - camera.y - (effect.sprite.height * effect.size)/2;
                
                ctx.drawImage(
                    effect.sprite,
                    drawX,
                    drawY,
                    effect.sprite.width * effect.size,
                    effect.sprite.height * effect.size
                );
                
                if (effect.type === "quickSlash") {
                    ctx.strokeStyle = "rgba(0, 200, 255, 0.7)";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(
                        effect.x - camera.x,
                        effect.y - camera.y,
                        100 * (1 - progress),
                        0,
                        Math.PI * 2
                    );
                    ctx.stroke();
                }
            } else {
                ctx.fillStyle = effect.color;
                ctx.beginPath();
                ctx.arc(
                    effect.x - camera.x,
                    effect.y - camera.y,
                    effect.radius * (1 + progress),
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
            
            ctx.globalAlpha = 1.0;
        });
        
        this.projectiles.forEach(proj => {
            if (proj.sprite.complete) {
                ctx.drawImage(
                    proj.sprite,
                    proj.x - camera.x - proj.width/2,
                    proj.y - camera.y - proj.height/2,
                    proj.width,
                    proj.height
                );
            } else {
                ctx.fillStyle = "#F80";
                ctx.beginPath();
                ctx.arc(
                    proj.x - camera.x,
                    proj.y - camera.y,
                    8 * proj.size,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        });
    }
};

// ========== SISTEMA DE PARTÍCULAS ========== //
const particles = {
    list: [],
    
    addExplosion: function(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            
            this.list.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 2 + Math.random() * 4,
                life: 1000 + Math.random() * 500,
                startTime: Date.now()
            });
        }
    },
    
    update: function() {
        this.list = this.list.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // gravedad
            return Date.now() - p.startTime < p.life;
        });
    },
    
    draw: function() {
        this.list.forEach(p => {
            const progress = (Date.now() - p.startTime) / p.life;
            ctx.globalAlpha = 1 - progress;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(
                p.x - camera.x,
                p.y - camera.y,
                p.size * (1 - progress/2),
                0,
                Math.PI * 2
            );
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }
};

// ========== HABILIDADES ========== //
const skills = {
    list: [
        { 
            name: "Bola de Fuego", 
            key: "1", 
            cooldown: 3000, 
            lastUsed: 0,
            damage: 30,
            speed: 7,
            range: 300,
            size: 0.8,
            draw: function(x, y) {
                const isReady = this.isReady();
                ctx.fillStyle = isReady ? "rgba(255, 100, 0, 0.7)" : "rgba(80, 40, 0, 0.7)";
                ctx.fillRect(x, y, 40, 40);
                ctx.strokeStyle = isReady ? "#F80" : "#555";
                ctx.strokeRect(x, y, 40, 40);
                ctx.fillStyle = "#FFF";
                ctx.font = "16px Arial";
                ctx.fillText(this.key, x + 15, y + 25);
                
                if (!isReady) {
                    const remaining = (this.cooldown - (Date.now() - this.lastUsed)) / 1000;
                    ctx.fillText(remaining.toFixed(1), x + 10, y + 50);
                }
            },
            isReady: function() {
                return Date.now() - this.lastUsed > this.cooldown;
            },
            use: function() {
                if (!this.isReady()) return;
                this.lastUsed = Date.now();
                
                const direction = player.direction.x > 0 ? 'right' : 
                                 player.direction.x < 0 ? 'left' :
                                 player.direction.y < 0 ? 'up' : 'down';
                
                effects.addSkillEffect(
                    player.x,
                    player.y,
                    "fireball",
                    direction
                );
                
                effects.addProjectile(
                    player.x,
                    player.y,
                    player.direction.x,
                    player.direction.y,
                    this.speed,
                    this.damage,
                    this.range,
                    this.size
                );
                
                particles.addExplosion(player.x, player.y, "#FF8C00", 10);
            }
        },
        { 
            name: "Corte Veloz", 
            key: "2", 
            cooldown: 4000,
            lastUsed: 0,
            damage: 40,
            range: 80,
            duration: 300,
            draw: function(x, y) {
                const isReady = this.isReady();
                ctx.fillStyle = isReady ? "rgba(0, 200, 255, 0.7)" : "rgba(0, 50, 80, 0.7)";
                ctx.fillRect(x, y, 40, 40);
                ctx.strokeStyle = isReady ? "#0AF" : "#555";
                ctx.strokeRect(x, y, 40, 40);
                ctx.fillStyle = "#FFF";
                ctx.font = "16px Arial";
                ctx.fillText(this.key, x + 15, y + 25);
                
                if (!isReady) {
                    const remaining = (this.cooldown - (Date.now() - this.lastUsed)) / 1000;
                    ctx.fillText(remaining.toFixed(1), x + 10, y + 50);
                }
            },
            isReady: function() {
                return Date.now() - this.lastUsed > this.cooldown;
            },
            use: function() {
                if (!this.isReady()) return;
                this.lastUsed = Date.now();
                
                // Determinar la dirección basada en la dirección del jugador
                let direction;
                if (Math.abs(player.direction.x) > Math.abs(player.direction.y)) {
                    direction = player.direction.x > 0 ? 'right' : 'left';
                } else {
                    direction = player.direction.y > 0 ? 'down' : 'up';
                }
                
                effects.addSkillEffect(
                    player.x,
                    player.y,
                    "quickSlash",
                    direction
                );
                
                effects.add(
                    player.x, 
                    player.y, 
                    "rgba(0, 200, 255, 0.5)", 
                    80, 
                    this.duration
                );
                
                const nearby = spatialGrid.getNearby(player.x, player.y, this.range);
                nearby.forEach(monster => {
                    if (!monster || typeof monster.update !== 'function') return;
                    
                    const dist = Math.hypot(monster.x - player.x, monster.y - player.y);
                    if (dist < this.range) {
                        combatSystem.applyDamage(player, monster, this.damage);
                        effects.add(
                            monster.x,
                            monster.y,
                            "rgba(0, 200, 255, 0.7)",
                            30,
                            300
                        );
                    }
                });
            }
        },
        { 
            name: "Escudo Divino", 
            key: "3", 
            cooldown: 10000,
            lastUsed: 0,
            duration: 3000,
            draw: function(x, y) {
                const isReady = this.isReady();
                ctx.fillStyle = isReady ? "rgba(100, 100, 255, 0.7)" : "rgba(30, 30, 80, 0.7)";
                ctx.fillRect(x, y, 40, 40);
                ctx.strokeStyle = isReady ? "#66F" : "#555";
                ctx.strokeRect(x, y, 40, 40);
                ctx.fillStyle = "#FFF";
                ctx.font = "16px Arial";
                ctx.fillText(this.key, x + 15, y + 25);
                
                if (!isReady) {
                    const remaining = (this.cooldown - (Date.now() - this.lastUsed)) / 1000;
                    ctx.fillText(remaining.toFixed(1), x + 10, y + 50);
                }
            },
            isReady: function() {
                return Date.now() - this.lastUsed > this.cooldown;
            },
            use: function() {
                if (!this.isReady()) return;
                this.lastUsed = Date.now();
                
                player.isShielded = true;
                effects.addSkillEffect(
                    player.x,
                    player.y,
                    "shield",
                    null
                );
                
                effects.add(
                    player.x, 
                    player.y, 
                    "rgba(100, 100, 255, 0.3)", 
                    100, 
                    this.duration
                );
                
                setTimeout(() => {
                    player.isShielded = false;
                }, this.duration);
                
                missions.showNotification("¡Escudo Divino!", "Eres invulnerable por 3 segundos");
            }
        }
    ],
    draw: function() {
        this.list.forEach((skill, i) => {
            skill.draw(20 + (i * 50), canvas.height - 60);
        });
    },
    handleKey: function(key) {
        this.list.forEach(skill => {
            if (skill.key === key) skill.use();
        });
    }
};

// ========== INVENTARIO ========== //
const items = {
    potion: { 
        name: "Poción", 
        type: "consumable", 
        health: 50, 
        sprite: sprites.potion,
        use: function() {
            if (player.health < player.maxHealth) {
                player.health = Math.min(player.maxHealth, player.health + this.health);
                const index = inventory.items.findIndex(item => item.name === "Poción");
                if (index !== -1) {
                    inventory.items.splice(index, 1);
                }
                effects.addFloatingText(
                    player.x,
                    player.y - 50,
                    `+${this.health}`,
                    "#0F0",
                    1000
                );
                particles.addExplosion(player.x, player.y, "#0F0", 15);
            } else {
                missions.showNotification("", "Salud al máximo, no se puede usar poción");
            }
        }
    }
};

const inventory = {
    slots: 6,
    items: [],
    selected: -1,
    isOpen: false,
    
    useSelected: function() {
        if (this.selected >= 0 && this.selected < this.items.length) {
            const item = this.items[this.selected];
            if (item.use) {
                item.use();
            }
        }
    }
};

function addItem(itemType) {
    if (inventory.items.length < inventory.slots) {
        const item = {...items[itemType]};
        inventory.items.push(item);
    }
}

function drawInventory() {
    if (!inventory.isOpen) return;
    
    const slotSize = 64;
    const startX = (canvas.width - (inventory.slots * slotSize)) / 2;
    const startY = canvas.height - 120;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(startX - 10, startY - 10, 
                inventory.slots * slotSize + 20, slotSize + 80);
    
    inventory.items.forEach((item, index) => {
        const x = startX + (index * slotSize);
        
        ctx.fillStyle = inventory.selected === index ? "rgba(100, 100, 255, 0.5)" : "rgba(50, 50, 50, 0.5)";
        ctx.fillRect(x, startY, slotSize, slotSize);
        ctx.strokeStyle = "#FFF";
        ctx.strokeRect(x, startY, slotSize, slotSize);
        
        if (item.sprite.complete) {
            ctx.drawImage(item.sprite, x, startY, slotSize, slotSize);
        }
    });
    
    if (inventory.selected !== -1 && inventory.items[inventory.selected]) {
        const item = inventory.items[inventory.selected];
        ctx.fillStyle = item.type === "consumable" ? "rgba(0, 200, 0, 0.7)" : "rgba(200, 200, 200, 0.7)";
        ctx.fillRect(startX, startY + slotSize + 10, inventory.slots * slotSize, 40);
        ctx.strokeStyle = "#FFF";
        ctx.strokeRect(startX, startY + slotSize + 10, inventory.slots * slotSize, 40);
        
        ctx.fillStyle = "#000";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            item.type === "consumable" ? "USAR (Enter)" : "EQUIPAR (Enter)", 
            startX + (inventory.slots * slotSize) / 2, 
            startY + slotSize + 35
        );
        ctx.textAlign = "left";
    }
}

// ========== MAPA GRANDE ========== //
const bigMap = {
    visible: false,
    scale: 0.5,
    padding: 20,
    
    draw: function() {
        if (!this.visible || !map || map.length === 0) return;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const mapWidth = map[0].length * tileSize * this.scale;
        const mapHeight = map.length * tileSize * this.scale;
        const startX = (canvas.width - mapWidth) / 2;
        const startY = (canvas.height - mapHeight) / 2;
        
        const zonaActual = zonas.zonas[zonas.zonaActual];
        if (!zonaActual) return;
        
        let floorSprite, wallSprite;
        
        switch(zonaActual.nombre) {
            case "Bosque de los Goblins":
                floorSprite = sprites.floorForest;
                wallSprite = sprites.wallForest;
                break;
            case "Cueva de los Hobgoblins":
                floorSprite = sprites.floorCave;
                wallSprite = sprites.wallCave;
                break;
            case "Ruinas del Goblin Shaman":
                floorSprite = sprites.floorRuins;
                wallSprite = sprites.wallRuins;
                break;
            case "Fortaleza de los Goblinoides":
                floorSprite = sprites.floorFortress;
                wallSprite = sprites.wallFortress;
                break;
            case "Trono del Señor Goblin":
                floorSprite = sprites.floorThrone;
                wallSprite = sprites.wallThrone;
                break;
            default:
                floorSprite = sprites.floorTile;
                wallSprite = sprites.wallTile;
        }
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                const tile = map[y][x];
                const tileX = startX + (x * tileSize * this.scale);
                const tileY = startY + (y * tileSize * this.scale);
                
                if (tile === 1 && floorSprite.complete) {
                    ctx.drawImage(floorSprite, tileX, tileY, tileSize * this.scale, tileSize * this.scale);
                } else if (tile === 2 && wallSprite.complete) {
                    ctx.drawImage(wallSprite, tileX, tileY, tileSize * this.scale, tileSize * this.scale);
                } else {
                    ctx.fillStyle = tile === 1 ? zonaActual.colorFondo : "#000";
                    ctx.fillRect(tileX, tileY, tileSize * this.scale, tileSize * this.scale);
                }
            }
        }
        
        ctx.fillStyle = "#00F";
        ctx.beginPath();
        ctx.arc(
            startX + (player.x * this.scale),
            startY + (player.y * this.scale),
            5 * this.scale,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = "#F00";
        monsters.forEach(monster => {
            if (!monster || typeof monster.update !== 'function') return;
            
            ctx.beginPath();
            ctx.arc(
                startX + (monster.x * this.scale),
                startY + (monster.y * this.scale),
                (monster.isBoss ? 8 : 5) * this.scale,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            if (monster.isBoss) {
                ctx.fillStyle = "#FF0";
                ctx.beginPath();
                ctx.arc(
                    startX + (monster.x * this.scale),
                    startY + (monster.y * this.scale),
                    (monster.isBoss ? 8 : 5) * this.scale,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                ctx.fillStyle = "#F00";
            }
        });
        
        ctx.fillStyle = "#FFF";
        ctx.font = "16px Arial";
        ctx.textAlign = "left";
        const helpX = startX + mapWidth + 20;
        const helpY = startY + 30;
        
        ctx.fillText("Controles:", helpX, helpY);
        ctx.fillText("- Flechas: Movimiento", helpX, helpY + 25);
        ctx.fillText("- Espacio: Ataque básico", helpX, helpY + 50);
        ctx.fillText("- 1: Bola de Fuego", helpX, helpY + 75);
        ctx.fillText("- 2: Corte Veloz", helpX, helpY + 100);
        ctx.fillText("- 3: Escudo Divino", helpX, helpY + 125);
        ctx.fillText("- Q: Usar poción", helpX, helpY + 150);
        ctx.fillText("- I: Inventario", helpX, helpY + 175);
        ctx.fillText("- M: Mostrar/Ocultar mapa", helpX, helpY + 200);
        ctx.fillText("- G: Guardar partida", helpX, helpY + 225);
        ctx.fillText("Presiona M para cerrar", helpX, helpY + 250);
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(startX, startY + mapHeight + 10, mapWidth, 60);
        ctx.strokeStyle = "#FFD700";
        ctx.strokeRect(startX, startY + mapHeight + 10, mapWidth, 60);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Leyenda:", startX + mapWidth/2, startY + mapHeight + 30);
        
        ctx.fillStyle = "#00F";
        ctx.fillText("■ Jugador", startX + mapWidth/4, startY + mapHeight + 50);
        ctx.fillStyle = "#F00";
        ctx.fillText("■ Enemigos", startX + mapWidth/2, startY + mapHeight + 50);
        ctx.fillStyle = "#FF0";
        ctx.fillText("■ Jefe", startX + mapWidth*3/4, startY + mapHeight + 50);
    }
};

// ========== INTERFAZ DE USUARIO ========== //
function drawUI() {
    const healthPercent = player.health / player.maxHealth;
    ctx.fillStyle = "#F00";
    ctx.fillRect(20, 20, 200 * healthPercent, 20);
    ctx.strokeStyle = "#FFF";
    ctx.strokeRect(20, 20, 200, 20);
    
    ctx.fillStyle = "#FFF";
    ctx.font = "16px Arial";
    ctx.fillText(`HP: ${Math.floor(player.health)}/${player.maxHealth}`, 25, 38);
    ctx.fillText(`ATQ: ${player.attack}`, 25, 55);
    
    ctx.font = "12px Arial";
    ctx.fillText(`Monstruos: ${monsters.length}`, canvas.width - 150, 30);
    ctx.fillText(`Proyectiles: ${effects.projectiles.length}`, canvas.width - 150, 50);
    
    const bossExists = monsters.some(m => m && m.isBoss);
    if (bossExists) {
        ctx.fillStyle = "#FF0";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("¡JEFE EN EL ÁREA!", canvas.width / 2, 40);
        ctx.textAlign = "left";
    }
    
    missions.drawMissionInfo();
    zonas.dibujarInfoZona();
    
    if (DEBUG_MODE && Date.now() - lastDebugUpdate > 100) {
        debugInfo.style.display = 'block';
        debugInfo.innerHTML = `
            Posición: (${Math.floor(player.x)}, ${Math.floor(player.y)})<br>
            Zona: ${zonas.zonaActual + 1}<br>
            Celdas activas: ${Object.keys(spatialGrid.grid).length}<br>
            FPS: ${Math.round(getFPS())}
        `;
        lastDebugUpdate = Date.now();
    } else if (!DEBUG_MODE) {
        debugInfo.style.display = 'none';
    }
}

function drawVictoryScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("¡VICTORIA!", canvas.width/2, canvas.height/2 - 50);
    
    ctx.font = "24px Arial";
    ctx.fillText("Has derrotado al Señor Goblin", canvas.width/2, canvas.height/2 + 20);
    ctx.fillText("y completado la campaña", canvas.width/2, canvas.height/2 + 60);
    
    ctx.font = "18px Arial";
    ctx.fillStyle = "#FFF";
    ctx.fillText("Presiona F5 para reiniciar", canvas.width/2, canvas.height/2 + 120);
    
    ctx.font = "20px Arial";
    ctx.fillText(`Zonas completadas: ${zonas.zonas.filter(z => z.completada).length}/${zonas.zonas.length}`, 
                canvas.width/2, canvas.height/2 + 180);
}

let lastTime = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;

function getFPS() {
    return fps;
}

// ========== CONTROLES ========== //
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    space: false,
    q: false,
    lastSpace: 0
};

window.addEventListener("keydown", (e) => {
    if (disableControls) return;
    
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key === " ") keys.space = true;
    if (e.key.toLowerCase() === "i") inventory.isOpen = !inventory.isOpen;
    if (e.key.toLowerCase() === "d") DEBUG_MODE = !DEBUG_MODE;
    if (e.key.toLowerCase() === "m") bigMap.visible = !bigMap.visible;
    if (e.key.toLowerCase() === "g") {
        zonas.guardarProgreso();
        const saveNotification = document.getElementById('save-notification');
        saveNotification.textContent = "Partida guardada correctamente";
        saveNotification.style.display = 'block';
        setTimeout(() => {
            saveNotification.style.display = 'none';
        }, 2000);
    }
    
    if (e.key.toLowerCase() === "q" && inventory.items.length > 0) {
        const potionIndex = inventory.items.findIndex(item => item.name === "Poción");
        if (potionIndex !== -1) {
            inventory.selected = potionIndex;
            inventory.useSelected();
        }
    }
    
    skills.handleKey(e.key);
    
    if (inventory.isOpen && e.key >= "1" && e.key <= "6") {
        const slot = parseInt(e.key) - 1;
        inventory.selected = slot < inventory.items.length ? slot : -1;
    }
    
    if (inventory.isOpen && e.key === "Enter" && inventory.selected !== -1) {
        inventory.useSelected();
    }
});

window.addEventListener("keyup", (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key === " ") keys.space = false;
    if (e.key.toLowerCase() === "q") keys.q = false;
});

// ========== BUCLE PRINCIPAL ========== //
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameCompleted) {
        drawVictoryScreen();
        return;
    }
    
    if (!bigMap.visible && !disableControls) {
        spatialGrid.clear();
        spatialGrid.insert(player);
        monsters.forEach(monster => {
            if (monster && typeof monster.update === 'function') {
                spatialGrid.insert(monster);
            }
        });
        
        updatePlayerPosition(deltaTime);
        camera.update();
        checkCombat(deltaTime);
        effects.update();
        particles.update();
        if (zonas && zonas.verificarEventos) zonas.verificarEventos();
        
        if (keys.space && basicAttack.isReady()) {
            basicAttack.use();
        }
        
        drawMap();
        monsters.forEach(monster => {
            if (monster && typeof monster.draw === 'function') {
                monster.draw();
            }
        });
        player.draw();
        effects.draw();
        particles.draw();
        drawUI();
        drawInventory();
        skills.draw();
    }
    
    bigMap.draw();
    
    requestAnimationFrame(gameLoop);
}

function updatePlayerPosition(deltaTime) {
    if (disableControls) return;
    
    let newX = player.x;
    let newY = player.y;
    
    if (keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight) {
        player.direction = { x: 0, y: 0 };
        if (keys.ArrowUp) player.direction.y = -1;
        if (keys.ArrowDown) player.direction.y = 1;
        if (keys.ArrowLeft) player.direction.x = -1;
        if (keys.ArrowRight) player.direction.x = 1;
        
        const length = Math.hypot(player.direction.x, player.direction.y);
        if (length > 0) {
            player.direction.x /= length;
            player.direction.y /= length;
        }
    }
    
    if (keys.ArrowUp) newY -= player.speed * (deltaTime / 16);
    if (keys.ArrowDown) newY += player.speed * (deltaTime / 16);
    if (keys.ArrowLeft) newX -= player.speed * (deltaTime / 16);
    if (keys.ArrowRight) newX += player.speed * (deltaTime / 16);
    
    if (newX !== player.x || newY !== player.y) {
        const margin = player.width / 3;
        const topLeft = checkCollision(newX - margin, newY - margin);
        const topRight = checkCollision(newX + margin, newY - margin);
        const bottomLeft = checkCollision(newX - margin, newY + margin);
        const bottomRight = checkCollision(newX + margin, newY + margin);
        
        if (!topLeft && !topRight && !bottomLeft && !bottomRight) {
            player.x = newX;
            player.y = newY;
        }
    }
    
    if (map && map.length > 0 && map[0].length > 0) {
        player.x = Math.max(player.width/2, Math.min(map[0].length * tileSize - player.width/2, player.x));
        player.y = Math.max(player.height/2, Math.min(map.length * tileSize - player.height/2, player.y));
    }
    
    monsters.forEach(monster => {
        if (!monster || typeof monster.update !== 'function') return;
        
        if (!monster.isBoss && map && map.length > 0 && map[0].length > 0) {
            const tileX = Math.floor(monster.x / tileSize);
            const tileY = Math.floor(monster.y / tileSize);
            const isInBossRoom = (tileX >= 9 && tileX <= 11 && tileY >= 9 && tileY <= 11);
            const isInSafeZone = (tileX >= 1 && tileX <= 3 && tileY >= 1 && tileY <= 3);
            
            if (isInBossRoom || isInSafeZone) {
                const dx = monster.x - 10 * tileSize;
                const dy = monster.y - 10 * tileSize;
                const angle = Math.atan2(dy, dx);
                
                monster.x = 10 * tileSize + Math.cos(angle) * (tileSize * 2.5);
                monster.y = 10 * tileSize + Math.sin(angle) * (tileSize * 2.5);
            }
        }
    });
}

// ========== INICIAR JUEGO ========== //
function initGame() {
    if (!zonas || !zonas.init) {
        console.error("Error: Sistema de zonas no cargado");
        return;
    }
    
    zonas.init();
    
    if (!zonas.zonas || !zonas.zonas[zonas.zonaActual] || !zonas.zonas[zonas.zonaActual].mapa) {
        console.error("Error: Mapa no inicializado");
        return;
    }
    
    map = zonas.zonas[zonas.zonaActual].mapa;
    
    // Spawn en zona segura (2,2) que es el centro del área 3x3 segura
    player.x = 2 * tileSize + tileSize/2;
    player.y = 2 * tileSize + tileSize/2;
    
    addItem("potion");
    addItem("potion");
    
    monsters.length = 0;
    spatialGrid.clear();
    spatialGrid.insert(player);
    
    spawnMonsters(8 + zonas.zonaActual * 2);
    
    requestAnimationFrame(gameLoop);
}