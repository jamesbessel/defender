// ── DEFENDER - Classic Arcade Game Clone ──────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const radarCanvas = document.getElementById('radarCanvas');
const radarCtx = radarCanvas.getContext('2d');

// Game constants
const WORLD_WIDTH = 10000;
const PLAYER_ACCELERATION = 0.4;  // Thrust power
const PLAYER_MAX_SPEED = 8;         // Max velocity
const PLAYER_DRAG = 0.98;          // Slight drag (1 = no drag)
const PLAYER_VERTICAL_LIMIT = 2.2;    // Max vertical speed (40% slower)
const BULLET_SPEED = 15;
const ENEMY_SPEED = 3;

// Game state
const game = {
    state: 'start',
    score: 0,
    level: 1,
    lives: 3,
    smartBombs: 3,
    player: null,
    bullets: [],
    enemies: [],
    particles: [],
    explosions: [],
    stars: [],
    cameraX: 0,
    keys: {},
    wrapWorld: true
};

// Initialize stars for parallax background
for (let i = 0; i < 200; i++) {
    game.stars.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.1
    });
}

// Player class
class Player {
    constructor() {
        this.x = WORLD_WIDTH / 2;
        this.y = canvas.height / 2;
        this.vx = 0;  // Velocity X
        this.vy = 0;  // Velocity Y
        this.width = 40;
        this.height = 20;
        this.direction = 1; // 1 = right, -1 = left
        this.thrusting = false;
        this.invincible = false;
        this.invincibleTime = 0;
        this.doubleFire = false;
        this.doubleFireEndTime = 0;
        this.shielded = false;
        this.shieldEndTime = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - game.cameraX, this.y);
        
        if (this.direction === -1) {
            ctx.scale(-1, 1);
        }
        
        // Shield effect
        if (this.shielded) {
            ctx.strokeStyle = '#9932cc';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#9932cc';
            ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 5;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Ship body
        ctx.fillStyle = this.invincible ? '#ffffff' : '#00ff00';
        ctx.shadowColor = this.invincible ? '#ffffff' : '#00ff00';
        ctx.shadowBlur = this.invincible ? 20 : 5;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-15, -12);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-15, 12);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Cockpit
        ctx.fillStyle = '#00cc00';
        ctx.fillRect(5, -4, 8, 8);
        
        // Engine flame (show when thrusting OR drifting)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (this.thrusting || speed > 0.5) {
            ctx.fillStyle = '#ff6600';
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(-20 - Math.random() * 15, 0);
            ctx.lineTo(-10, 5);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }

    update() {
        this.thrusting = false;
        
        // Apply thrust when pressing keys
        if (game.keys['ArrowUp'] || game.keys['KeyW']) {
            this.vy -= PLAYER_ACCELERATION;
            this.thrusting = true;
        }
        if (game.keys['ArrowDown'] || game.keys['KeyS']) {
            this.vy += PLAYER_ACCELERATION;
            this.thrusting = true;
        }
        if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
            this.vx -= PLAYER_ACCELERATION;
            this.direction = -1;
            this.thrusting = true;
        }
        if (game.keys['ArrowRight'] || game.keys['KeyD']) {
            this.vx += PLAYER_ACCELERATION;
            this.direction = 1;
            this.thrusting = true;
        }
        
        // Apply drag (space friction for playability)
        this.vx *= PLAYER_DRAG;
        this.vy *= PLAYER_DRAG;
        
        // Clamp velocities
        this.vx = Math.max(-PLAYER_MAX_SPEED, Math.min(PLAYER_MAX_SPEED, this.vx));
        this.vy = Math.max(-PLAYER_VERTICAL_LIMIT, Math.min(PLAYER_VERTICAL_LIMIT, this.vy));
        
        // Apply velocity to position
        this.x += this.vx;
        this.y += this.vy;
        
        // Boundary constraints (soft bounce)
        if (this.y < 50) {
            this.y = 50;
            this.vy = Math.abs(this.vy) * 0.3; // Bounce down slightly
        }
        if (this.y > canvas.height - 50) {
            this.y = canvas.height - 50;
            this.vy = -Math.abs(this.vy) * 0.3; // Bounce up slightly
        }
        
        // World wrap (with velocity preservation)
        if (this.x < 0) this.x = WORLD_WIDTH;
        if (this.x > WORLD_WIDTH) this.x = 0;
        
        // Update camera (smooth follow)
        game.cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, this.x - canvas.width / 2));
        
        // Invincibility timer
        if (this.invincible && Date.now() > this.invincibleTime) {
            this.invincible = false;
        }
    }

    shoot() {
        const bullet = {
            x: this.x + (this.direction === 1 ? 25 : -25),
            y: this.y,
            vx: BULLET_SPEED * this.direction,
            vy: 0,
            player: true
        };
        game.bullets.push(bullet);
        playSound('shoot');
        
        if (this.doubleFire) {
            const bullet2 = {
                x: this.x + (this.direction === 1 ? 20 : -20),
                y: this.y + (this.direction === 1 ? 5 : -5),
                vx: BULLET_SPEED * this.direction,
                vy: this.direction === 1 ? 1 : -1,
                player: true
            };
            game.bullets.push(bullet2);
        }
    }
}

// Enemy base class
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.alive = true;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.angle = 0;
        this.speed = ENEMY_SPEED + Math.random();
        this.health = this.getHealth();
        this.flash = 0; // Flash timer when hit
    }
    
    getHealth() {
        switch(this.type) {
            case 'pod': return 1;
            case 'lander': return 1;
            case 'swarmer': return 1;
            case 'baiter': return 2;
            case 'pulsar': return 2;
            case 'mutant': return 3;
            case 'spikeball': return 1;
            case 'shield': return 1;
            default: return 1;
        }
    }
    
    hit() {
        this.health--;
        this.flash = 10; // Flash for 10 frames
        if (this.health <= 0) {
            this.alive = false;
            return true; // Destroyed
        }
        return false; // Just damaged
    }

    draw() {
        const screenX = this.x - game.cameraX;
        if (screenX < -50 || screenX > canvas.width + 50) return;
        
        ctx.save();
        ctx.translate(screenX, this.y);
        
        // Flash white when hit
        ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.getColor();
        if (this.flash > 0) this.flash--;
        
        switch(this.type) {
            case 'pod':
                this.drawPod();
                break;
            case 'lander':
                this.drawLander();
                break;
            case 'swarmer':
                this.drawSwarmer();
                break;
            case 'baiter':
                this.drawBaiter();
                break;
            case 'pulsar':
                this.drawPulsar();
                break;
            case 'mutant':
                this.drawMutant();
                break;
            case 'spikeball':
                this.drawSpikeball();
                break;
            case 'shield':
                this.drawShield();
                break;
        }
        
        ctx.restore();
    }

    getColor() {
        switch(this.type) {
            case 'pod': return '#ff00ff';
            case 'lander': return '#ff6600';
            case 'swarmer': return '#ffff00';
            case 'baiter': return '#00ffff';
            case 'pulsar': return '#ff0066';
            case 'mutant': return '#ff0000';
            case 'spikeball': return '#ff6600';
            case 'shield': return '#9932cc';
            default: return '#ffffff';
        }
    }

    drawPod() {
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillRect(-8, -8, 4, 4);
        ctx.fillRect(4, -8, 4, 4);
    }

    drawLander() {
        ctx.fillRect(-15, -8, 30, 16);
        ctx.fillStyle = '#000';
        ctx.fillRect(-10, -5, 6, 6);
        ctx.fillRect(4, -5, 6, 6);
        ctx.fillRect(-3, 3, 6, 4);
    }

    drawSwarmer() {
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(12, 12);
        ctx.lineTo(-12, 12);
        ctx.closePath();
        ctx.fill();
    }

    drawBaiter() {
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-4, -4, 3, 0, Math.PI * 2);
        ctx.arc(4, -4, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPulsar() {
        ctx.save();
        ctx.rotate(this.angle);
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(-2, -20, 4, 40);
            ctx.rotate(Math.PI / 5);
        }
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawMutant() {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-20, -10, 40, 20);
        ctx.fillStyle = '#000';
        ctx.fillRect(-15, -6, 10, 10);
        ctx.fillRect(5, -6, 10, 10);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-12, -4, 4, 4);
        ctx.fillRect(8, -4, 4, 4);
    }

    drawSpikeball() {
        ctx.save();
        ctx.rotate(this.angle * 2);
        const spikes = 8;
        const outerRadius = 18;
        const innerRadius = 10;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * 2 / (spikes * 2)) * i;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawShield() {
        ctx.save();
        ctx.translate(0, Math.sin(Date.now() / 300) * 5);
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#9932cc';
        ctx.shadowBlur = 10;
        ctx.fillText('🛡️', 0, 0);
        ctx.restore();
    }

    update() {
        // Basic AI movement
        if (this.type === 'baiter') {
            // Baiters track player
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.x += (dx / dist) * this.speed * 0.5;
                this.y += (dy / dist) * this.speed * 0.5;
            }
            this.y = Math.max(50, Math.min(canvas.height - 50, this.y));
        } else if (this.type === 'swarmer') {
            // Swarmers move toward player
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 50) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        } else if (this.type === 'shield') {
            // Shields meander slowly
            this.x += Math.sin(Date.now() / 1000 + this.x) * 0.5;
            this.y += Math.cos(Date.now() / 800 + this.y) * 0.5;
        } else {
            // Other enemies oscillate
            this.y += Math.sin(Date.now() / 500 + this.x) * 1;
            this.x += this.direction * this.speed;
        }
        
        this.angle += 0.1;
        
        // World wrap
        if (this.x < 0) this.x = WORLD_WIDTH;
        if (this.x > WORLD_WIDTH) this.x = 0;
    }

    getPoints() {
        switch(this.type) {
            case 'pod': return 200;
            case 'lander': return 150;
            case 'swarmer': return 100;
            case 'baiter': return 250;
            case 'pulsar': return 300;
            case 'mutant': return 500;
            case 'spikeball': return 300;
            case 'shield': return 200;
            default: return 100;
        }
    }
}

// Initialize game
function initGame() {
    game.player = new Player();
    game.bullets = [];
    game.enemies = [];
    game.particles = [];
    game.explosions = [];
}

function spawnEnemies() {
    game.enemies = [];
    const numEnemies = 10 + game.level * 5;
    const types = ['pod', 'lander', 'swarmer'];
    
    if (game.level >= 2) types.push('baiter');
    if (game.level >= 3) types.push('pulsar');
    if (game.level >= 4) types.push('mutant');
    
    for (let i = 0; i < numEnemies; i++) {
        let x = Math.random() * WORLD_WIDTH;
        while (Math.abs(x - game.player.x) < 500) {
            x = Math.random() * WORLD_WIDTH;
        }
        const y = 100 + Math.random() * (canvas.height - 200);
        const type = types[Math.floor(Math.random() * types.length)];
        game.enemies.push(new Enemy(x, y, type));
    }
    
    for (let i = 0; i < 3; i++) {
        let x = Math.random() * WORLD_WIDTH;
        while (Math.abs(x - game.player.x) < 500) {
            x = Math.random() * WORLD_WIDTH;
        }
        const y = 100 + Math.random() * (canvas.height - 200);
        game.enemies.push(new Enemy(x, y, 'spikeball'));
    }
    
    for (let i = 0; i < 2; i++) {
        let x = Math.random() * WORLD_WIDTH;
        while (Math.abs(x - game.player.x) < 500) {
            x = Math.random() * WORLD_WIDTH;
        }
        const y = 100 + Math.random() * (canvas.height - 200);
        game.enemies.push(new Enemy(x, y, 'shield'));
    }
}

// Particle system
function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 / 15) * i;
        const speed = 2 + Math.random() * 4;
        game.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30,
            color: color
        });
    }
    game.explosions.push({x, y, radius: 5, maxRadius: 40});
}

// Sound effects
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    switch(type) {
        case 'shoot':
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'explosion':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'playerHit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'levelUp':
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(500, now + 0.1);
            osc.frequency.setValueAtTime(600, now + 0.2);
            osc.frequency.setValueAtTime(800, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.setValueAtTime(0.1, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'smartBomb':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'powerup':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            osc.frequency.setValueAtTime(800, now + 0.2);
            osc.frequency.setValueAtTime(1200, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'shield':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(500, now + 0.15);
            osc.frequency.setValueAtTime(700, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
    }
}

// Update HUD
function updateHUD() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('level').textContent = game.level;
    document.getElementById('lives').textContent = game.lives;
    document.getElementById('enemies').textContent = game.enemies.filter(e => e.alive).length;
}

// Draw stars (parallax)
function drawStars() {
    ctx.fillStyle = '#ffffff';
    game.stars.forEach(star => {
        const parallaxX = (star.x - game.cameraX * 0.3) % WORLD_WIDTH;
        if (parallaxX < 0) return;
        ctx.fillRect(parallaxX, star.y, star.size, star.size);
    });
}

// Draw terrain
function drawTerrain() {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const startX = Math.floor(game.cameraX / 50) * 50;
    for (let x = startX; x < game.cameraX + canvas.width + 50; x += 50) {
        const screenX = x - game.cameraX;
        const height = 30 + Math.sin(x / 200) * 15 + Math.cos(x / 100) * 10;
        
        if (x === startX) {
            ctx.moveTo(screenX, canvas.height - height);
        } else {
            ctx.lineTo(screenX, canvas.height - height);
        }
    }
    ctx.stroke();
}

// Draw bullets
function drawBullets() {
    game.bullets.forEach(bullet => {
        const screenX = bullet.x - game.cameraX;
        
        // Only draw if on screen
        if (screenX < -20 || screenX > canvas.width + 20) return;
        
        // Bullet glow - pink when double fire is active
        const bulletColor = game.player.doubleFire ? '#ff6600' : '#00ff00';
        ctx.fillStyle = bulletColor;
        ctx.shadowColor = bulletColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(screenX, bullet.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

// Draw radar
function drawRadar() {
    radarCtx.fillStyle = '#001100';
    radarCtx.fillRect(0, 0, radarCanvas.width, radarCanvas.height);
    
    // Draw enemies on radar
    game.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const radarX = (enemy.x / WORLD_WIDTH) * radarCanvas.width;
        
        if (enemy.type === 'spikeball') {
            radarCtx.fillStyle = '#ff6600';
        } else if (enemy.type === 'shield') {
            radarCtx.fillStyle = '#9932cc';
        } else {
            radarCtx.fillStyle = '#ff0000';
        }
        radarCtx.fillRect(radarX - 2, enemy.y / canvas.height * 60 - 2, 4, 4);
    });
    
    // Draw player on radar
    radarCtx.fillStyle = '#00ff00';
    const playerRadarX = (game.player.x / WORLD_WIDTH) * radarCanvas.width;
    const playerRadarY = game.player.y / canvas.height * 60;
    radarCtx.fillRect(playerRadarX - 3, playerRadarY - 3, 6, 6);
}

// Draw explosions
function drawExplosions() {
    game.explosions.forEach((exp, i) => {
        ctx.strokeStyle = `rgba(255, ${Math.floor(255 * (1 - exp.radius / exp.maxRadius))}, 0, ${1 - exp.radius / exp.maxRadius})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(exp.x - game.cameraX, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        exp.radius += 2;
        if (exp.radius >= exp.maxRadius) {
            game.explosions.splice(i, 1);
        }
    });
}

// Draw particles
function drawParticles() {
    game.particles.forEach((p, i) => {
        const screenX = p.x - game.cameraX;
        ctx.fillStyle = p.color;
        ctx.fillRect(screenX, p.y, 4, 4);
        
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        if (p.life <= 0) {
            game.particles.splice(i, 1);
        }
    });
}

function activateDoubleFire() {
    const POWERUP_DURATION = 10000;
    if (game.player.doubleFire) {
        game.player.doubleFireEndTime += POWERUP_DURATION;
    } else {
        game.player.doubleFire = true;
        game.player.doubleFireEndTime = Date.now() + POWERUP_DURATION;
    }
    playSound('powerup');
}

function activateShield() {
    const SHIELD_DURATION = 10000;
    if (game.player.shielded) {
        game.player.shieldEndTime += SHIELD_DURATION;
    } else {
        game.player.shielded = true;
        game.player.shieldEndTime = Date.now() + SHIELD_DURATION;
    }
    playSound('shield');
}

// Collision detection
function checkCollisions() {
    // Bullets hitting enemies
    game.bullets = game.bullets.filter(bullet => {
        if (!bullet.player) return true;
        
        for (let enemy of game.enemies) {
            if (!enemy.alive) continue;
            
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Increased hit radius from 20 to 35
            if (dist < 35) {
                if (enemy.type === 'spikeball') {
                    activateDoubleFire();
                    enemy.alive = false;
                    createExplosion(enemy.x, enemy.y, enemy.getColor());
                    updateHUD();
                } else if (enemy.type === 'shield') {
                    activateShield();
                    enemy.alive = false;
                    createExplosion(enemy.x, enemy.y, enemy.getColor());
                    updateHUD();
                } else if (enemy.hit()) {
                    game.score += enemy.getPoints();
                    createExplosion(enemy.x, enemy.y, enemy.getColor());
                    playSound('explosion');
                    updateHUD();
                }
                return false;
            }
        }
        
        return true;
    });
    
    // Enemies hitting player
    if (!game.player.invincible && !game.player.shielded) {
        for (let enemy of game.enemies) {
            if (!enemy.alive) continue;
            
            const dx = game.player.x - enemy.x;
            const dy = game.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Increased hit radius from 30 to 40
            if (dist < 40) {
                playerHit();
                return;
            }
        }
    }
}

function playerHit() {
    game.lives--;
    playSound('playerHit');
    createExplosion(game.player.x, game.player.y, '#00ff00');
    
    if (game.lives <= 0) {
        game.state = 'gameover';
        showMessage('GAME OVER', `Final Score: ${game.score}<br>Press SPACE to restart`);
    } else {
        game.player.invincible = true;
        game.player.invincibleTime = Date.now() + 2000;
        game.player.x = WORLD_WIDTH / 2;
        game.player.y = canvas.height / 2;
    }
    updateHUD();
}

function useSmartBomb() {
    if (game.smartBombs <= 0) return;
    
    game.smartBombs--;
    playSound('smartBomb');
    
    game.enemies.forEach(enemy => {
        if (enemy.alive) {
            enemy.alive = false;
            game.score += enemy.getPoints();
            createExplosion(enemy.x, enemy.y, '#ffffff');
        }
    });
    game.enemies = [];
    
    // Create big explosion effect
    for (let i = 0; i < 10; i++) {
        createExplosion(
            game.cameraX + Math.random() * canvas.width,
            Math.random() * canvas.height,
            '#ffffff'
        );
    }
    updateHUD();
}

function checkLevelComplete() {
    if (game.enemies.every(e => !e.alive)) {
        game.level++;
        playSound('levelUp');
        spawnEnemies();
        updateHUD();
    }
}

// Show message
function showMessage(title, text) {
    document.getElementById('message-title').innerHTML = title;
    document.getElementById('message-text').innerHTML = text;
    document.getElementById('message').classList.remove('hidden');
}

function hideMessage() {
    document.getElementById('message').classList.add('hidden');
}

// Main game loop
function gameLoop() {
    if (game.state !== 'playing') return;
    
    if (game.player.doubleFire && Date.now() > game.player.doubleFireEndTime) {
        game.player.doubleFire = false;
    }
    
    if (game.player.shielded && Date.now() > game.player.shieldEndTime) {
        game.player.shielded = false;
    }
    
    // Clear
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update
    game.player.update();
    game.enemies.forEach(e => e.update());
    
    // Move bullets
    game.bullets = game.bullets.filter(bullet => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // World wrap for bullets
        if (bullet.x < 0) bullet.x = WORLD_WIDTH;
        if (bullet.x > WORLD_WIDTH) bullet.x = 0;
        
        const screenX = bullet.x - game.cameraX;
        // Keep bullets in a reasonable screen range
        return screenX > -100 && screenX < canvas.width + 100;
    });
    
    // Collisions
    checkCollisions();
    
    // Remove dead enemies
    game.enemies = game.enemies.filter(e => e.alive);
    
    // Check level complete
    checkLevelComplete();
    
    // Draw
    drawStars();
    drawTerrain();
    game.enemies.forEach(e => e.draw());
    drawBullets();
    game.player.draw();
    drawExplosions();
    drawParticles();
    drawRadar();
    
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    game.score = 0;
    game.level = 1;
    game.lives = 3;
    game.smartBombs = 3;
    game.state = 'playing';
    initGame();
    spawnEnemies();
    updateHUD();
    hideMessage();
    gameLoop();
}

// Input handling
document.addEventListener('keydown', (e) => {
    initAudio();
    game.keys[e.code] = true;
    
    if (e.code === 'Space') {
        e.preventDefault();
        
        if (game.state === 'start' || game.state === 'gameover') {
            startGame();
        } else if (game.state === 'playing') {
            game.player.shoot();
        }
    }
    
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        if (game.state === 'playing') {
            useSmartBomb();
        }
    }
});

document.addEventListener('keyup', (e) => {
    game.keys[e.code] = false;
});

// Initialize
initGame();
updateHUD();

// ── Mobile Touch Support ───────────────────────────────────────────────────

const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function setupMobileControls() {
    if (!isMobile) return;

    const touchControls = document.getElementById('touch-controls');
    const mobileControlsHint = document.getElementById('mobile-controls');
    const messageControls = document.getElementById('message-controls');

    touchControls.classList.remove('hidden');
    mobileControlsHint.classList.remove('hidden');
    messageControls.classList.add('hidden');

    resizeCanvas();

    const btnFire = document.getElementById('btn-fire');
    const btnControl = document.getElementById('btn-control');

    // FIRE BUTTON - Simple fire only
    let fireInterval = null;
    const FIRE_RATE = 150;

    function handleFire() {
        initAudio();
        if (game.state === 'start' || game.state === 'gameover') {
            startGame();
        } else if (game.state === 'playing') {
            game.player.shoot();
        }
    }

    function startFiring() {
        handleFire();
        fireInterval = setInterval(() => {
            if (game.state === 'playing') {
                game.player.shoot();
            }
        }, FIRE_RATE);
    }

    function stopFiring() {
        if (fireInterval) {
            clearInterval(fireInterval);
            fireInterval = null;
        }
    }

    btnFire.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btnFire.classList.add('active');
        startFiring();
    }, { passive: false });
    btnFire.addEventListener('touchend', (e) => {
        e.preventDefault();
        btnFire.classList.remove('active');
        stopFiring();
    }, { passive: false });
    btnFire.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        btnFire.classList.remove('active');
        stopFiring();
    }, { passive: false });

    btnFire.addEventListener('mousedown', (e) => {
        e.preventDefault();
        btnFire.classList.add('active');
        startFiring();
    });
    btnFire.addEventListener('mouseup', (e) => {
        e.preventDefault();
        btnFire.classList.remove('active');
        stopFiring();
    });
    btnFire.addEventListener('mouseleave', (e) => {
        btnFire.classList.remove('active');
        stopFiring();
    });

    // CONTROL BUTTON - Thrust + direction control
    let controlInterval = null;
    let controlTouchStartX = null;
    let controlTouchStartY = null;
    let isControlActive = false;
    const CONTROL_RATE = 50;
    const DIRECTION_THRESHOLD = 2.6;

    function startControl() {
        game.keys['ArrowUp'] = true;
        controlInterval = setInterval(() => {
            game.keys['ArrowUp'] = true;
        }, CONTROL_RATE);
    }

    function stopControl() {
        game.keys['ArrowUp'] = false;
        game.keys['ArrowDown'] = false;
        game.keys['ArrowLeft'] = false;
        game.keys['ArrowRight'] = false;
        if (controlInterval) {
            clearInterval(controlInterval);
            controlInterval = null;
        }
        controlTouchStartX = null;
        controlTouchStartY = null;
        isControlActive = false;
    }

    function handleControlTouchStart(e) {
        e.preventDefault();
        btnControl.classList.add('active');
        initAudio();
        const touch = e.touches[0];
        controlTouchStartX = touch.clientX;
        controlTouchStartY = touch.clientY;
        isControlActive = true;
        startControl();
    }

    function handleControlTouchMove(e) {
        if (!isControlActive || controlTouchStartX === null) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - controlTouchStartX;
        const deltaY = controlTouchStartY - touch.clientY;

        game.keys['ArrowUp'] = deltaY > DIRECTION_THRESHOLD;
        game.keys['ArrowDown'] = deltaY < -DIRECTION_THRESHOLD;
        game.keys['ArrowLeft'] = deltaX < -DIRECTION_THRESHOLD;
        game.keys['ArrowRight'] = deltaX > DIRECTION_THRESHOLD;

        if (game.player) {
            if (deltaX < -DIRECTION_THRESHOLD) {
                game.player.direction = -1;
            } else if (deltaX > DIRECTION_THRESHOLD) {
                game.player.direction = 1;
            }
        }
    }

    function handleControlTouchEnd(e) {
        e.preventDefault();
        btnControl.classList.remove('active');
        stopControl();
    }

    btnControl.addEventListener('touchstart', handleControlTouchStart, { passive: false });
    btnControl.addEventListener('touchmove', handleControlTouchMove, { passive: false });
    btnControl.addEventListener('touchend', handleControlTouchEnd, { passive: false });
    btnControl.addEventListener('touchcancel', handleControlTouchEnd, { passive: false });

    // CONTROL BUTTON - Mouse support for desktop testing
    btnControl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        btnControl.classList.add('active');
        initAudio();
        isControlActive = true;
        startControl();
    });
    btnControl.addEventListener('mouseup', (e) => {
        e.preventDefault();
        btnControl.classList.remove('active');
        stopControl();
    });
    btnControl.addEventListener('mouseleave', (e) => {
        btnControl.classList.remove('active');
        stopControl();
    });

    // BOMB BUTTON
    const btnBomb = document.getElementById('btn-bomb');

    function handleBomb() {
        initAudio();
        if (game.state === 'playing') {
            useSmartBomb();
        }
    }

    btnBomb.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btnBomb.classList.add('active');
        handleBomb();
    }, { passive: false });
    btnBomb.addEventListener('touchend', (e) => {
        e.preventDefault();
        btnBomb.classList.remove('active');
    }, { passive: false });
    btnBomb.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        btnBomb.classList.remove('active');
    }, { passive: false });

    btnBomb.addEventListener('mousedown', (e) => {
        e.preventDefault();
        btnBomb.classList.add('active');
        handleBomb();
    });
    btnBomb.addEventListener('mouseup', (e) => {
        e.preventDefault();
        btnBomb.classList.remove('active');
    });
    btnBomb.addEventListener('mouseleave', (e) => {
        btnBomb.classList.remove('active');
    });

    document.addEventListener('touchmove', (e) => {
        if (game.state === 'playing') {
            e.preventDefault();
        }
    }, { passive: false });
}

function resizeCanvas() {
    const aspectRatio = 1000 / 600;
    
    let maxWidth, maxHeight;
    
    if (isMobile) {
        maxWidth = window.innerWidth - 20;
        maxHeight = window.innerHeight - 250;
    } else {
        maxWidth = Math.min(window.innerWidth - 40, 1000);
        maxHeight = Math.min(window.innerHeight - 150, 600);
    }
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }
    
    canvas.width = width;
    canvas.height = height;
    radarCanvas.width = width;
    radarCanvas.height = 50;
    
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    radarCanvas.style.width = width + 'px';
    radarCanvas.style.height = '50px';
}

function initDisplay() {
    resizeCanvas();
    
    window.addEventListener('resize', resizeCanvas);
    if (isMobile) {
        window.addEventListener('orientationchange', () => {
            setTimeout(resizeCanvas, 100);
        });
    }
}

setupMobileControls();
initDisplay();
