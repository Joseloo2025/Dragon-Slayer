const missions = {
    currentMission: null,
    completedMissions: [],
    killCount: 0,
    requiredKills: 10,
    bossDoorLocked: true,

    init: function() {
        this.currentMission = zonas.zonas[zonas.zonaActual].mision;
        this.requiredKills = zonas.zonas[zonas.zonaActual].mision.cantidadRequerida;
    },

    updateKillCount: function(isBossKill = false) {
        if (isBossKill) {
            if (zonas.zonaActual === 4 && zonas.zonas[4].misionJefe.desbloqueado) {
                zonas.zonas[4].misionJefe.progreso++;
                if (zonas.zonas[4].misionJefe.progreso >= zonas.zonas[4].misionJefe.cantidadRequerida) {
                    this.completeMission();
                }
            }
            return;
        }
        
        this.killCount++;
        if (this.currentMission) {
            this.currentMission.progreso = this.killCount;
            
            if (this.killCount >= this.requiredKills) {
                this.completeMission();
            }
        }
    },

    completeMission: function() {
        if (!this.currentMission) return;
        
        if (zonas.zonaActual === 4) {
            if (this.currentMission.objetivoTipo === "Elite Goblin") {
                player.baseAttack = Math.floor(player.baseAttack * 1.02);
                
                this.showNotification(
                    "¡Furia Sagrada!",
                    "Has eliminado a los Guardianes Élite. \n" +
                    "El poder de los caídos te otorga +2% de ataque \n" +
                    "hasta derrotar al Señor Goblin."
                );
                
                zonas.zonas[zonas.zonaActual].misionJefe.desbloqueado = true;
                this.currentMission = zonas.zonas[zonas.zonaActual].misionJefe;
                this.requiredKills = 1;
                this.killCount = 0;
                this.bossDoorLocked = false;
                
                map[8][10] = 1;
                
                setTimeout(() => {
                    this.showNotification(
                        "¡Camino Despejado!",
                        "Las puertas del trono se abren. \n" +
                        "Enfrenta al Señor Goblin en su santuario."
                    );
                }, 3500);
                return;
            }
            else if (this.currentMission.objetivoTipo === "Señor Goblin") {
                player.baseAttack = player.originalAttack;
                
                this.showMissionComplete(this.currentMission);
                setTimeout(() => {
                    this.showNotification(
                        "¡VICTORIA!", 
                        "Has derrotado al Señor Goblin y completado la campaña"
                    );
                    gameCompleted = true;
                }, 3500);
                return;
            }
        }
        
        this.bossDoorLocked = false;
        map[8][10] = 1;
        
        this.showMissionComplete(this.currentMission);
        
        setTimeout(() => {
            this.showNotification("¡La sala del jefe está ahora abierta!", "Dirígete al centro del mapa");
        }, 3500);
        
        this.currentMission = null;
    },

    showMissionComplete: function(mission) {
        let notification = document.getElementById('mission-notification');
        notification.innerHTML = `
            <h2>¡Misión Completada!</h2>
            <p>${mission.titulo}</p>
            <p>Recompensa: ${mission.recompensa}</p>
        `;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    },

    showNotification: function(title, message) {
        let notification = document.getElementById('mission-notification');
        notification.innerHTML = `
            <h2>${title}</h2>
            <p>${message}</p>
        `;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    },

    showDoorMessage: function(message) {
        let doorNotification = document.getElementById('door-notification');
        doorNotification.textContent = message;
        doorNotification.style.display = 'block';
        
        setTimeout(() => {
            doorNotification.style.display = 'none';
        }, 2000);
    },

    drawMissionInfo: function() {
        if (!this.currentMission) return;
        
        const mission = this.currentMission;
        const progressPercent = Math.min(100, (mission.progreso / mission.cantidadRequerida) * 100);
        const remaining = Math.max(0, mission.cantidadRequerida - mission.progreso);
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(20, 70, 250, 80);
        ctx.strokeStyle = "#FFD700";
        ctx.strokeRect(20, 70, 250, 80);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "14px Arial";
        ctx.fillText("Misión Actual:", 25, 90);
        
        ctx.font = "12px Arial";
        ctx.fillText(mission.titulo, 25, 105);
        ctx.fillText(mission.descripcion, 25, 120);
        
        ctx.fillStyle = "#333";
        ctx.fillRect(25, 125, 200, 8);
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(25, 125, 200 * (progressPercent / 100), 8);
        ctx.strokeStyle = "#FFF";
        ctx.strokeRect(25, 125, 200, 8);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "10px Arial";
        ctx.fillText(`${Math.min(mission.progreso, mission.cantidadRequerida)}/${mission.cantidadRequerida} (${Math.round(progressPercent)}%) - Faltan: ${remaining}`, 25, 145);
    },

    checkBossDoor: function(x, y) {
        const doorX = 10 * tileSize;
        const doorY = 8 * tileSize;
        const doorWidth = tileSize;
        const doorHeight = tileSize;
        
        if (x >= doorX && x < doorX + doorWidth && y >= doorY && y < doorY + doorHeight) {
            return this.bossDoorLocked;
        }
        return false;
    },

    drawBossDoor: function() {
        if (!this.bossDoorLocked) return;
        
        const doorX = 10 * tileSize - camera.x;
        const doorY = 8 * tileSize - camera.y;
        
        ctx.fillStyle = "rgba(150, 0, 0, 0.7)";
        ctx.fillRect(doorX, doorY, tileSize, tileSize);
        ctx.strokeStyle = "#FF0";
        ctx.lineWidth = 3;
        ctx.strokeRect(doorX, doorY, tileSize, tileSize);
        ctx.lineWidth = 1;
        
        ctx.fillStyle = "#FF0";
        ctx.beginPath();
        ctx.arc(doorX + tileSize/2, doorY + tileSize/3, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(doorX + tileSize/2, doorY + tileSize/3 + 10, 10, Math.PI, Math.PI * 2);
        ctx.stroke();
        
        const playerX = player.x - camera.x;
        const playerY = player.y - camera.y;
        const distance = Math.hypot(doorX + tileSize/2 - playerX, doorY + tileSize/2 - playerY);
        
        if (distance < 150) {
            this.showDoorMessage("Puerta cerrada: Mata " + (this.requiredKills - this.killCount) + " más para desbloquear");
        }
    }
};