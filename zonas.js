// zonas.js
const zonas = {
    zonaActual: 0,
    zonas: [
        {
            nombre: "Bosque de los Goblins",
            descripcion: "Un bosque infestado de Goblins jóvenes y débiles",
            mapa: null,
            seed: null,
            enemigos: ["Goblin"],
            jefe: "Goblin Jefe",
            colorFondo: "#2A2",
            mision: {
                titulo: "Eliminar Goblins",
                descripcion: "Mata 10 Goblins para desbloquear al jefe",
                objetivo: "kill",
                objetivoTipo: "Goblin",
                cantidadRequerida: 10,
                progreso: 0,
                recompensa: "Acceso al jefe de zona"
            },
            eventos: [
                {
                    tipo: "spawn",
                    posicion: { x: 5, y: 5 },
                    condicion: (progreso) => progreso >= 5,
                    accion: function() {
                        spawnMonsters(3);
                        missions.showNotification("¡Evento!", "Una horda de Goblins ha aparecido");
                    },
                    ejecutado: false
                }
            ],
            completada: false,
            bossAbility: null
        },
        {
            nombre: "Cueva de los Hobgoblins",
            descripcion: "Una oscura cueva habitada por Hobgoblins más fuertes",
            mapa: null,
            seed: null,
            enemigos: ["Hobgoblin"],
            jefe: "Hobgoblin Anciano",
            colorFondo: "#555",
            mision: {
                titulo: "Eliminar Hobgoblins",
                descripcion: "Mata 8 Hobgoblins para desbloquear al jefe",
                objetivo: "kill",
                objetivoTipo: "Hobgoblin",
                cantidadRequerida: 8,
                progreso: 0,
                recompensa: "Acceso al jefe de zona"
            },
            eventos: [
                {
                    tipo: "trampa",
                    posicion: { x: 10, y: 15 },
                    accion: function() {
                        combatSystem.applyDamage({attack: 10}, player, 10);
                        missions.showNotification("¡Trampa!", "Has activado una trampa de pinchos");
                        effects.add(player.x, player.y, "#F00", 50, 500);
                    },
                    ejecutado: false
                }
            ],
            completada: false,
            bossAbility: null
        },
        {
            nombre: "Ruinas del Goblin Shaman",
            descripcion: "Antiguas ruinas donde Goblin Shaman practican magia oscura",
            mapa: null,
            seed: null,
            enemigos: ["Goblin", "Goblin Shaman"],
            jefe: "Gran Shaman Goblin",
            colorFondo: "#A2A",
            mision: {
                titulo: "Derrotar Shamanes",
                descripcion: "Mata 5 Goblin Shaman para desbloquear al jefe",
                objetivo: "kill",
                objetivoTipo: "Goblin Shaman",
                cantidadRequerida: 5,
                progreso: 0,
                recompensa: "Acceso al jefe de zona"
            },
            eventos: [
                {
                    tipo: "cofre",
                    posicion: { x: 15, y: 5 },
                    accion: function() {
                        addItem("potion");
                        addItem("potion");
                        missions.showNotification("¡Cofre encontrado!", "Has obtenido 2 pociones");
                        map[5][15] = 1;
                    },
                    ejecutado: false
                }
            ],
            completada: false,
            bossAbility: null
        },
        {
            nombre: "Fortaleza de los Goblinoides",
            descripcion: "Una fortaleza gobernada por poderosos Goblinoides",
            mapa: null,
            seed: null,
            enemigos: ["Hobgoblin", "Bugbear"],
            jefe: "Rey Goblin",
            colorFondo: "#822",
            mision: {
                titulo: "Eliminar Goblinoides",
                descripcion: "Mata 12 Goblinoides para desbloquear al jefe",
                objetivo: "kill",
                objetivoTipo: "Goblinoid",
                cantidadRequerida: 12,
                progreso: 0,
                recompensa: "Acceso al jefe de zona"
            },
            eventos: [
                {
                    tipo: "puente",
                    posicion: { x: 10, y: 18 },
                    accion: function() {
                        map[18][10] = 1;
                        missions.showNotification("¡Puente activado!", "Has bajado el puente levadizo");
                    },
                    ejecutado: false
                }
            ],
            completada: false,
            bossAbility: null
        },
        {
            nombre: "Trono del Señor Goblin",
            descripcion: "El santuario del temido Señor Goblin, protegido por sus élites",
            mapa: null,
            seed: null,
            enemigos: ["Elite Goblin"],
            jefe: "Señor Goblin",
            colorFondo: "#000",
            mision: {
                titulo: "Eliminar Guardias Élite",
                descripcion: "Mata 5 Elite Goblins para desbloquear al Señor Goblin",
                objetivo: "kill",
                objetivoTipo: "Elite Goblin",
                cantidadRequerida: 5,
                progreso: 0,
                recompensa: "Acceso al Señor Goblin"
            },
            misionJefe: {
                titulo: "Confrontar al Señor Goblin",
                descripcion: "Derrota al Señor Goblin para completar tu misión",
                objetivo: "boss",
                objetivoTipo: "Señor Goblin",
                cantidadRequerida: 1,
                progreso: 0,
                recompensa: "Finalizar la campaña",
                desbloqueado: false
            },
            eventos: [
                {
                    tipo: "final",
                    posicion: { x: 10, y: 10 },
                    accion: function() {
                        if (this.misionJefe.desbloqueado) {
                            missions.showNotification("¡Felicidades!", "Has completado el juego");
                        }
                    },
                    ejecutado: false
                }
            ],
            completada: false,
            bossAbility: null
        }
    ],

    init: function() {
        this.cargarProgreso();
        
        this.zonas.forEach((zona, index) => {
            if (!zona.mapa) {
                this.zonas[index].seed = Math.random().toString(36).substring(2, 15);
                this.zonas[index].mapa = this.generarMapa(index);
            }
        });
        
        missions.currentMission = this.zonas[this.zonaActual].mision;
        missions.requiredKills = this.zonas[this.zonaActual].mision.cantidadRequerida;
    },

    generarMapa: function(indexZona) {
        const tileSize = 64;
        const map = Array(20).fill().map(() => Array(20).fill(1));
        
        // Paredes exteriores
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 20; x++) {
                if (x === 0 || y === 0 || x === 19 || y === 19) {
                    map[y][x] = 2;
                }
                
                // Marcar posiciones de eventos
                (this.zonas[indexZona].eventos || []).forEach(evento => {
                    if (evento && evento.posicion && typeof evento.posicion.x === 'number' && typeof evento.posicion.y === 'number') {
                        if (evento.posicion.x === x && evento.posicion.y === y) {
                            map[y][x] = 3;
                        }
                    }
                });
            }
        }

        // Sala del jefe
        for (let x = 8; x <= 12; x++) {
            for (let y = 8; y <= 12; y++) {
                if (x === 8 || y === 8 || x === 12 || y === 12) {
                    map[y][x] = 2;
                } else {
                    map[y][x] = 1;
                }
            }
        }
        
        // Asegurar camino a la puerta del jefe
        map[8][10] = 1; // Puerta del jefe
        map[7][10] = 1; // Celda arriba de la puerta
        map[9][10] = 1; // Celda abajo de la puerta
        
        // Zona segura (3x3 en esquina superior izquierda)
        for (let y = 1; y <= 3; y++) {
            for (let x = 1; x <= 3; x++) {
                map[y][x] = 1;
                // Asegurar acceso a la zona segura
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && ny >= 0 && nx < 20 && ny < 20) {
                            map[ny][nx] = 1;
                        }
                    }
                }
            }
        }
        
        // Generar paredes internas con validación
        let intentos = 0;
        const maxIntentos = 10;
        let mapaValido = false;
        
        while (!mapaValido && intentos < maxIntentos) {
            const seed = this.zonas[indexZona].seed;
            const rng = this.seededRandom(seed + intentos);
            
            for (let y = 1; y < 19; y++) {
                for (let x = 1; x < 19; x++) {
                    const isNearBossPath = (
                        (y >= 6 && y <= 12 && x >= 9 && x <= 11) || 
                        (y === 8 && x >= 8 && x <= 12)
                    );
                    
                    const isSafeZone = (x >= 1 && x <= 4 && y >= 1 && y <= 4);
                    
                    if (!isNearBossPath && !isSafeZone && map[y][x] === 1 && rng() < (0.1 + indexZona * 0.02)) {
                        map[y][x] = 2;
                    }
                }
            }
            
            this.validarAccesibilidadEventos(map, this.zonas[indexZona].eventos);
            
            const inicio = {x: 2, y: 2}; // Zona segura
            const puerta = {x: 10, y: 8}; // Puerta del jefe
            
            if (this.esAccesible(map, inicio, puerta)) {
                mapaValido = true;
            } else {
                for (let y = 6; y <= 9; y++) {
                    for (let x = 9; x <= 11; x++) {
                        map[y][x] = 1;
                    }
                }
                intentos++;
            }
        }
        
        return map;
    },

    seededRandom: function(seed) {
        let value = 0;
        for (let i = 0; i < seed.length; i++) {
            value += seed.charCodeAt(i);
        }
        let x = Math.sin(value) * 10000;
        return function() {
            x = Math.sin(x) * 10000;
            return x - Math.floor(x);
        };
    },

    esAccesible: function(mapa, inicio, objetivo) {
        const visitado = new Set();
        const cola = [{x: inicio.x, y: inicio.y}];
        const direcciones = [[0,1],[1,0],[0,-1],[-1,0]];
        
        while (cola.length > 0) {
            const actual = cola.shift();
            const clave = `${actual.x},${actual.y}`;
            
            if (visitado.has(clave)) continue;
            visitado.add(clave);
            
            if (actual.x === objetivo.x && actual.y === objetivo.y) {
                return true;
            }
            
            for (const [dx, dy] of direcciones) {
                const nx = actual.x + dx;
                const ny = actual.y + dy;
                
                if (nx >= 0 && ny >= 0 && nx < mapa[0].length && ny < mapa.length) {
                    if (mapa[ny][nx] === 1 || mapa[ny][nx] === 3) {
                        cola.push({x: nx, y: ny});
                    }
                }
            }
        }
        return false;
    },

    validarAccesibilidadEventos: function(mapa, eventos) {
        const inicio = {x: 2, y: 2}; // Zona segura
        
        for (const evento of (eventos || [])) {
            if (evento && evento.posicion) {
                if (!this.esAccesible(mapa, inicio, evento.posicion)) {
                    mapa[evento.posicion.y][evento.posicion.x] = 1;
                    
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = evento.posicion.x + dx;
                            const ny = evento.posicion.y + dy;
                            if (nx >= 0 && ny >= 0 && nx < mapa[0].length && ny < mapa.length) {
                                if (mapa[ny][nx] === 2) {
                                    mapa[ny][nx] = 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    verificarEventos: function() {
        const zona = this.zonas[this.zonaActual];
        const tileX = Math.floor(player.x / tileSize);
        const tileY = Math.floor(player.y / tileSize);
        
        (zona.eventos || []).forEach(evento => {
            if (evento && evento.posicion && evento.posicion.x === tileX && evento.posicion.y === tileY) {
                if (!evento.ejecutado && (!evento.condicion || evento.condicion(zona.mision.progreso))) {
                    evento.accion();
                    evento.ejecutado = true;
                }
            }
        });
    },

    avanzarZona: function() {
        if (this.zonaActual < this.zonas.length - 1) {
            this.zonaActual++;
            this.zonas[this.zonaActual - 1].completada = true;
            
            map = this.zonas[this.zonaActual].mapa;
            
            missions.currentMission = this.zonas[this.zonaActual].mision;
            missions.requiredKills = this.zonas[this.zonaActual].mision.cantidadRequerida;
            missions.killCount = 0;
            missions.bossDoorLocked = true;
            
            // Teletransportar a zona segura
            player.x = 2 * tileSize + tileSize/2;
            player.y = 2 * tileSize + tileSize/2;
            
            monsters.length = 0;
            bossSpawned = false;
            
            const enemigosIniciales = 8 + this.zonaActual * 2;
            spawnMonsters(enemigosIniciales);
            
            missions.showNotification(
                `¡Zona ${this.zonaActual + 1}: ${this.zonas[this.zonaActual].nombre}!`,
                this.zonas[this.zonaActual].descripcion
            );
            
            return true;
        }
        return false;
    },

    actualizarProgresoMision: function(tipoEnemigo, esJefe = false) {
        const zona = this.zonas[this.zonaActual];
        
        if (esJefe) {
            if (this.zonaActual === 4 && zona.misionJefe && zona.misionJefe.desbloqueado) {
                if (tipoEnemigo === zona.jefe) {
                    zona.misionJefe.progreso = 1;
                    missions.killCount = 0;
                    missions.completeMission();
                }
            }
            else if (zona.mision.objetivo === "boss" && tipoEnemigo === zona.jefe) {
                zona.mision.progreso = 1;
                missions.killCount = 0;
                missions.completeMission();
            }
        } else {
            if (zona.mision.objetivo === "kill") {
                if (zona.mision.objetivoTipo === "Goblinoid" && 
                    (tipoEnemigo === "Hobgoblin" || tipoEnemigo === "Bugbear")) {
                    zona.mision.progreso++;
                } else if (tipoEnemigo === zona.mision.objetivoTipo) {
                    zona.mision.progreso++;
                }
                
                missions.killCount = zona.mision.progreso;
                
                if (zona.mision.progreso >= zona.mision.cantidadRequerida) {
                    missions.completeMission();
                }
            }
        }
    },

    guardarProgreso: function() {
        const datosGuardado = {
            zonaActual: this.zonaActual,
            mapas: this.zonas.map(zona => ({
                mapa: zona.mapa,
                seed: zona.seed
            })),
            zonas: this.zonas.map(zona => ({
                completada: zona.completada,
                mision: {
                    progreso: zona.mision.progreso
                },
                misionJefe: zona.misionJefe ? {
                    desbloqueado: zona.misionJefe.desbloqueado,
                    progreso: zona.misionJefe.progreso
                } : null,
                eventos: (zona.eventos || []).map(evento => ({
                    ejecutado: evento.ejecutado,
                    posicion: evento.posicion
                })),
                bossAbility: null
            })),
            jugador: {
                x: player.x,
                y: player.y,
                health: player.health,
                maxHealth: player.maxHealth,
                baseAttack: player.baseAttack,
                originalAttack: player.originalAttack
            },
            inventario: inventory.items.map(item => item.name),
            version: 3
        };
        
        localStorage.setItem('goblinSlayerSave', JSON.stringify(datosGuardado));
    },

    cargarProgreso: function() {
        const datosGuardado = localStorage.getItem('goblinSlayerSave');
        if (!datosGuardado) return;
        
        try {
            const datos = JSON.parse(datosGuardado);
            
            if (!datos.version) {
                // Lógica para migrar versiones antiguas si es necesario
            }
            
            this.zonaActual = datos.zonaActual || 0;
            
            if (datos.mapas) {
                datos.mapas.forEach((mapaGuardado, index) => {
                    if (this.zonas[index]) {
                        this.zonas[index].mapa = mapaGuardado.mapa;
                        this.zonas[index].seed = mapaGuardado.seed;
                    }
                });
            }
            
            datos.zonas.forEach((zonaGuardada, index) => {
                if (this.zonas[index]) {
                    this.zonas[index].completada = zonaGuardada.completada;
                    this.zonas[index].mision.progreso = zonaGuardada.mision.progreso;
                    
                    if (zonaGuardada.misionJefe && this.zonas[index].misionJefe) {
                        this.zonas[index].misionJefe.desbloqueado = zonaGuardada.misionJefe.desbloqueado;
                        this.zonas[index].misionJefe.progreso = zonaGuardada.misionJefe.progreso;
                    }
                    
                    (zonaGuardada.eventos || []).forEach((eventoGuardado, i) => {
                        if (this.zonas[index].eventos && this.zonas[index].eventos[i]) {
                            this.zonas[index].eventos[i].ejecutado = eventoGuardado.ejecutado;
                            this.zonas[index].eventos[i].posicion = eventoGuardado.posicion;
                        }
                    });
                }
            });
            
            if (datos.jugador) {
                player.x = datos.jugador.x || 400;
                player.y = datos.jugador.y || 300;
                player.health = datos.jugador.health || player.maxHealth;
                player.maxHealth = datos.jugador.maxHealth || player.maxHealth;
                player.baseAttack = datos.jugador.baseAttack || player.baseAttack;
                player.originalAttack = datos.jugador.originalAttack || player.baseAttack;
            }
            
            if (datos.inventario) {
                inventory.items = [];
                datos.inventario.forEach(itemNombre => {
                    if (items[itemNombre.toLowerCase()]) {
                        addItem(itemNombre.toLowerCase());
                    }
                });
            }
        } catch (e) {
            console.error("Error al cargar partida:", e);
            localStorage.removeItem('goblinSlayerSave');
        }
    },

    dibujarInfoZona: function() {
        const zona = this.zonas[this.zonaActual];
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(canvas.width - 270, 70, 250, 80);
        ctx.strokeStyle = "#FFD700";
        ctx.strokeRect(canvas.width - 270, 70, 250, 80);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "14px Arial";
        ctx.textAlign = "right";
        ctx.fillText(`Zona ${this.zonaActual + 1}/${this.zonas.length}:`, canvas.width - 25, 90);
        
        ctx.font = "bold 14px Arial";
        ctx.fillText(zona.nombre, canvas.width - 25, 110);
        
        ctx.font = "12px Arial";
        ctx.fillText(`Progreso: ${this.zonaActual} zonas completadas`, canvas.width - 25, 130);
        
        ctx.fillStyle = "rgba(0, 100, 0, 0.7)";
        ctx.fillRect(canvas.width - 270, 160, 250, 30);
        ctx.strokeStyle = "#0F0";
        ctx.strokeRect(canvas.width - 270, 160, 250, 30);
        ctx.fillStyle = "#FFF";
        ctx.textAlign = "center";
        ctx.fillText("Guardar Partida (G)", canvas.width - 145, 180);
        ctx.textAlign = "left";
    }
};