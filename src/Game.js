import Phaser from 'phaser';
var easystarjs = require('easystarjs');

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('game');
        this.meg;
        this.trapper;
        this.cursors;
        this.spaceKey;
        this.wasd;
        this.meg_last_direction;
        this.trapper_last_direction;
        this.gen;
        this.target_object;
        this.update_timer = 0;
        this.health_bar;
        this.health_bar_width = 100;
        this.health_bar_height = 10;
        this.health_bar_color = 0x2ecc71;
        this.health_text;
        this.attack_timer = 0; //controls rate at which health is lost
        this.is_dead;
        this.easystar = new easystarjs.js();
        this.zone;
        this.repairing = false;
        this.progress = 0;
        this.completed = false;
    }

    preload() {
        this.load.setPath('src/assets/');
        this.load.multiatlas('meg_sprites', 'meg_spritesheet.json');
        this.load.multiatlas('trapper_sprites', 'trapper_spritesheet.json');
        this.load.image('tiles', 'tiles/westworld.png');
        this.load.image('gen', 'objects/gen.png');
        this.load.tilemapTiledJSON('tilemap', 'tiles/west.json');
    }

    create() {
        // create the map
        var map = this.make.tilemap({ key: 'tilemap' })

        // first parameter is the name of the tilemap in tiled
        var tiles = map.addTilesetImage('tileset', 'tiles');

        // creating the layers
        map.createLayer('Ground', tiles, 0, 0);
        map.createLayer('Buildings', tiles, 0, 0);
        map.createLayer('Barriers', tiles, 0, 0);
        var obstacles = map.createLayer('Buildings and Ground', tiles, 0, 0);

        // create grid for pathfinding
        var pathfinder_grid = [];
        for(let y = 0; y < map.height; y++) {
            var col = [];
            for(var x = 0; x < map.width; x++) {
                var tile = map.getTileAt(x, y, true, 'Buildings and Ground');
                col.push(tile.index);
            }
            pathfinder_grid.push(col);
        }
        this.easystar.setGrid(pathfinder_grid);

        var tileset = map.tilesets[0];
        var properties = tileset.tileProperties;
        var acceptableTiles = [];
        for(var i = tileset.firstgid-1; i < tileset.total; i++){
            if(!properties.hasOwnProperty(i)) {
                acceptableTiles.push(i+1);
                continue;
            }
            if(!properties[i].collides) {
                acceptableTiles.push(i+1);
            }
        }
        this.easystar.setAcceptableTiles(acceptableTiles);
        //avoid generator
        this.easystar.avoidAdditionalPoint(30, 24);
        this.easystar.avoidAdditionalPoint(31, 23);
        this.easystar.avoidAdditionalPoint(31, 24);
        this.easystar.avoidAdditionalPoint(31, 25);
        this.easystar.avoidAdditionalPoint(32, 24);
        //avoid getting stuck on objects
        this.easystar.avoidAdditionalPoint(23, 26);
        this.easystar.avoidAdditionalPoint(26, 26);

        //creating the sprites
        this.meg = this.physics.add.sprite(200, 200, 'meg_sprites', 'meg_sprite_21.png').setSize(16, 16).setOffset(24, 35); //changed from 25, 25
        this.meg.setScale(0.8, 0.8);
        this.trapper = this.physics.add.sprite(64, 64, 'trapper_sprites', 'trapper_sprite_78.png').setSize(16, 16).setOffset(24, 35); //changed from 30, 30 to avoid getting stuck
        this.trapper.setScale(0.8, 0.8);
        this.gen = this.physics.add.sprite(510, 360, 'gen').setSize(80, 80).setOffset(10, 250).setImmovable();
        this.gen.setScale(0.3, 0.3);
        this.target_object = this.physics.add.sprite(64, 64, 'meg_sprites', 'meg_sprite_21.png').setSize(1, 1);
        this.target_object.visible = false;

        map.createLayer('Foreground', tiles, 0, 0);

        //create health bar
        this.health_text = this.add.text(1, 4, 'Health', { fontSize: '10px', fill: '#000' }).setScrollFactor(0);
        this.health_bar = this.add.graphics().setScrollFactor(0);
        this.createHealthBar(this.health_bar, this.health_bar_width, this.health_bar_height, 40, 0, this.health_bar_color);

        // make all tiles in obstacles collidable
        // obstacles.setCollisionByExclusion([-1]);
        obstacles.setCollisionByProperty({collides: true});

        // don't go out of the map
        this.physics.world.bounds.width = map.widthInPixels;
        this.physics.world.bounds.height = map.heightInPixels;
        this.meg.setCollideWorldBounds(true);
        this.trapper.setCollideWorldBounds(true);

        // don't walk on trees
        this.physics.add.collider(this.meg, obstacles);
        this.physics.add.collider(this.trapper, obstacles);

        this.physics.add.collider(this.meg, this.gen);
        this.physics.add.collider(this.trapper, this.gen);

        //highlight collision areas of a layer
        // const debugGraphics = this.add.graphics().setAlpha(0.7);
        // showCollisionAreas(obstacles, debugGraphics);

        // limit camera to map
        // this.cameras.main.setBounds(0, 0, 120, 80);
        this.cameras.main.startFollow(this.meg);
        this.cameras.main.setSize(360, 240);
        this.cameras.main.setPosition(60, 60);
        // this.cameras.main.roundPixels = true; // avoid tile bleed

        this.zone = this.add.zone(510, 390).setSize(50, 50);
        this.physics.world.enable(this.zone);
        this.zone.body.moves = false;
        this.physics.add.overlap(this.meg, this.zone, this.repair());

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        }

        var megWalkUpFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 3, end: 10, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megWalkDownFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 22, end: 29, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megWalkLeftFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 11, end: 20, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megStandUpFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 2, end: 2, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megStandDownFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 21, end: 21, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megStandLeftFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 11, end: 11, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megRepairUpFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 145, end: 152, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megRepairDownFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 162, end: 169, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megRepairLeftFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 154, end: 161, prefix: 'meg_sprite_', suffix: '.png'
        });
        var megDeathFrameNames = this.anims.generateFrameNames('meg_sprites', {
            start: 122, end: 128, prefix: 'meg_sprite_', suffix: '.png'
        });
        var trapperWalkUpFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 61, end: 68, prefix: 'trapper_sprite_', suffix: '.png'
        });
        var trapperWalkDownFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 79, end: 86, prefix: 'trapper_sprite_', suffix: '.png'
        });
        var trapperWalkLeftFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 69, end: 77, prefix: 'trapper_sprite_', suffix: '.png'
        });
        var trapperStandUpFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 61, end: 61, prefix: 'trapper_sprite_', suffix: '.png'
        });
        var trapperStandDownFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 79, end: 79, prefix: 'trapper_sprite_', suffix: '.png'
        });
        var trapperStandLeftFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 69, end: 69, prefix: 'trapper_sprite_', suffix: '.png'
        });
        var trapperAttackUpFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 96, end: 101, prefix: 'trapper_sprite_', suffix: '.png'
        });
        var trapperAttackDownFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 108, end: 113, prefix: 'trapper_sprite_', suffix: '.png'
        });
        var trapperAttackLeftFrameNames = this.anims.generateFrameNames('trapper_sprites', {
            start: 102, end: 107, prefix: 'trapper_sprite_', suffix: '.png'
        });

        this.anims.create({
            key: 'meg-walk-up',
            frames: megWalkUpFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-walk-down',
            frames: megWalkDownFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-walk-left',
            frames: megWalkLeftFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-stand-up',
            frames: megStandUpFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-stand-down',
            frames: megStandDownFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-stand-left',
            frames: megStandLeftFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-repair-up',
            frames: megRepairUpFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-repair-down',
            frames: megRepairDownFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-repair-left',
            frames: megRepairLeftFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'meg-death',
            frames: megDeathFrameNames,
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'trapper-walk-up',
            frames: trapperWalkUpFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'trapper-walk-down',
            frames: trapperWalkDownFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'trapper-walk-left',
            frames: trapperWalkLeftFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'trapper-stand-left',
            frames: trapperStandLeftFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'trapper-stand-up',
            frames: trapperStandUpFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'trapper-stand-down',
            frames: trapperStandDownFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'trapper-attack-up',
            frames: trapperAttackUpFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'trapper-attack-down',
            frames: trapperAttackDownFrameNames,
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'trapper-attack-left',
            frames: trapperAttackLeftFrameNames,
            frameRate: 10,
            repeat: -1
        });
    }

    repair() {
        if(this.repairing && this.completed != true) {
            this.progress += .001;
            console.log(this.progress);
        }
    }

    createHealthBar(bar, size_x, size_y, position_x, position_y, color) {
        bar.lineStyle(4, 0x000000, 1.0);
        bar.strokeRoundedRect(2, 5, 100, 10, 5);
        bar.fillStyle(0xFFFFFF, 1);
        bar.fillRoundedRect(2, 5, 100, 10, 5);
        bar.fillStyle(color, 1);
        bar.fillRoundedRect(2, 5, size_x, size_y, 5);
        bar.x = position_x;
        bar.y = position_y;
        return bar;
    }

    update(time, delta) {
        //update_timer runs easystar path algorithm every x update triggers (roughly 60 update triggers/sec)
        //need to tweak update_timer and moveToObject speed parameters for better ai
        this.easystar.enableDiagonals();
        // this.easystar.enableCornerCutting();
        this.easystar.setIterationsPerCalculation(6000);
        if(this.update_timer === 50) {
            this.update_timer = 0;
            this.easystar.findPath(Math.floor(this.trapper.x/16), Math.floor(this.trapper.y/16), Math.floor(this.meg.x/16), Math.floor(this.meg.y/16), (path) => {
                if(path === null) {
                    console.log("Path was not found");
                }
                else {
                    for(let i = 1; i < 3; i++) {
                        this.target_object.x = path[i].x*16;
                        this.target_object.y = path[i].y*16;
                        this.physics.moveToObject(this.trapper, this.target_object, 150);
                    }
                    if(path[1].x > this.trapper.x/16 + 0.5) {
                        this.trapper.flipX = true;
                        this.trapper.anims.play('trapper-walk-left', true);
                        this.trapper_last_direction = "right";
                    }
                    else if(path[1].x < this.trapper.x/16 - 0.5) {
                        this.trapper.flipX = false;
                        this.trapper.anims.play('trapper-walk-left', true);
                        this.trapper_last_direction = "left";
                    }
                    else if(path[1].y < this.trapper.y/16) {
                        this.trapper.anims.play('trapper-walk-up', true);
                        this.trapper_last_direction = "up";
                    }
                    else if(path[1].y > this.trapper.y/16) {
                        this.trapper.anims.play('trapper-walk-down', true);
                        this.trapper_last_direction = "down";
                    }
                }
            });
            this.easystar.calculate();
        }

        if(Math.abs(this.meg.x - this.trapper.x) < 16 && Math.abs(this.meg.y - this.trapper.y) < 16) {
            this.trapper.setVelocityX(0);
            this.trapper.setVelocityY(0);
            if(this.trapper_last_direction === "up") {
                this.trapper.anims.play('trapper-attack-up', true);
            }
            else if(this.trapper_last_direction === "down") {
                this.trapper.anims.play('trapper-attack-down', true);
            }
            else if(this.trapper_last_direction === "right") {
                this.trapper.flipX = true;
                this.trapper.anims.play('trapper-attack-left', true);
            }
            else {
                this.trapper.flipX = false;
                this.trapper.anims.play('trapper-attack-left', true);
            }

            //adds damage quicker with lower attack_timer value
            if(this.attack_timer === 50) {
                this.attack_timer = 0;
                this.meg.setTint(0xff0000);
                this.health_bar_width -= 10;
                if(this.health_bar_width === 30) {
                    this.health_bar_color = 0xC62520;
                }
                else if(this.health_bar_width === 60) {
                    this.health_bar_color = 0xF1E738;
                }
                this.health_bar.destroy();
                this.health_bar = this.add.graphics().setScrollFactor(0);
                this.createHealthBar(this.health_bar, this.health_bar_width, this.health_bar_height, 40, 0, this.health_bar_color);
            }
            this.attack_timer++;
        }
        else {
            this.meg.setTint(0xffffff);
        }

        //sets game over screen when health reaches 0
        if(this.health_bar_width <= 0) {
            var game_over_text = this.add.text(100, 100, 'Game Over', { fontSize: '32px', fill: '#E92416'}).setScrollFactor(0);
            var restart_text = this.add.text(80, 130, 'Press Space to continue', { fontSize: '16px', fill: '#000000'}).setScrollFactor(0);
            if(!this.is_dead) {
                this.meg.anims.play('meg-death', true);
                this.is_dead = true;
            }
            this.physics.pause();
            this.health_bar.destroy();
            this.health_text.destroy();
            // var continue_button = {
            //     space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
            // }
            if(this.spaceKey.isDown) {
                //manually resetting state variables before restarting
                this.is_dead = false;
                this.health_bar_width = 100;
                this.health_bar_color = 0x2ecc71;
                this.update_timer = 0;
                this.repairing = false;
                this.progress = 0;
                this.completed = false;
                this.scene.restart();
            }
        }

        if(this.physics.overlap(this.meg, this.zone)) {
            if(this.spaceKey.isDown) {
                this.repairing = true;
            }
            else {
                this.repairing = false;
            }
            this.repair(); 
        }

        if(this.progress > 1 && this.completed == false) {
            console.log("done repairing")
            this.completed = true;
        }

        // this.zone.body.debugBodyColor = this.zone.body.touching.meg ? 0x00ffff : 0xffff00;

        this.update_timer++;
        this.meg.setVelocity(0);
        if(!this.is_dead) {
            if(this.cursors.right.isDown || this.wasd.right.isDown) {
                this.meg.setVelocityX(200);
                this.meg.body.velocity.normalize().scale(200);
            }
            else if(this.cursors.left.isDown || this.wasd.left.isDown) {
                this.meg.setVelocityX(-200);
                this. meg.body.velocity.normalize().scale(200);
            }

            if(this.cursors.up.isDown || this.wasd.up.isDown) {
                this.meg.setVelocityY(-200);
                this.meg.body.velocity.normalize().scale(200);
            }
            else if(this.cursors.down.isDown || this.wasd.down.isDown) {
                this.meg.setVelocityY(200);
                this.meg.body.velocity.normalize().scale(200);
            }

            // Update the animation last and give left/right animations precedence over up/down animations
            if (this.cursors.left.isDown || this.wasd.left.isDown)
            {
                this.meg.anims.play('meg-walk-left', true);
                this.meg.flipX = false;
                this.meg_last_direction = "left";
            }
            else if (this.cursors.right.isDown || this.wasd.right.isDown)
            {
                this.meg.anims.play('meg-walk-left', true);
                this.meg.flipX = true;
                this.meg_last_direction = "right";
            }
            else if (this.cursors.up.isDown || this.wasd.up.isDown)
            {
                this.meg.anims.play('meg-walk-up', true);
                this.meg_last_direction = "up";
            }
            else if (this.cursors.down.isDown || this.wasd.down.isDown)
            {
                this.meg.anims.play('meg-walk-down', true);
                this.meg_last_direction = "down";
            }
            else
            {
                var standing_or_repairing = '';
                if(this.repairing) {
                    standing_or_repairing = "repair";
                }
                else {
                    standing_or_repairing = "stand";
                }
                if(this.meg_last_direction === "right") {
                    this.meg.flipX = true;
                    this.meg.anims.play('meg-'+standing_or_repairing+'-left', true);
                }
                else if(this.meg_last_direction === "left") {
                    this.meg.anims.play('meg-'+standing_or_repairing+'-left', true);
                }
                else if(this.meg_last_direction === "up") {
                    this.meg.anims.play('meg-'+standing_or_repairing+'-up', true);
                }
                else if(this.meg_last_direction === "down") {
                    this.meg.anims.play('meg-'+standing_or_repairing+'-down', true);
                }
            }
        }
    }
}