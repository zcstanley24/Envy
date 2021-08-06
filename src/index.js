import 'phaser';
var easystarjs = require('easystarjs');
import showCollisionAreas from './helper_functions/showCollisionAreas';

var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 640,
    height: 480,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        zoom: 2.5
    }
}
    var easystar = new easystarjs.js();
    var game = new Phaser.Game(config);
    var meg;
    var trapper;
    var cursors;
    var wasd;
    var meg_last_direction;
    var trapper_last_direction;
    var gen;
    var target_object;
    var update_timer = 0;
    var health_bar;
    var attack_timer = 0; //controls rate at which health is lost

    function preload() {
        this.load.multiatlas('meg_sprites', 'assets/meg_spritesheet.json', 'assets');
        this.load.multiatlas('trapper_sprites', 'assets/trapper_spritesheet.json', 'assets');
        this.load.image('tiles', 'assets/tiles/westworld.png');
        this.load.image('gen', 'assets/objects/gen.png');
        this.load.tilemapTiledJSON('tilemap', 'assets/tiles/west.json');
    }

    function create() {
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
        easystar.setGrid(pathfinder_grid);

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
        easystar.setAcceptableTiles(acceptableTiles);
        //avoid generator
        easystar.avoidAdditionalPoint(30, 24);
        easystar.avoidAdditionalPoint(31, 23);
        easystar.avoidAdditionalPoint(31, 24);
        easystar.avoidAdditionalPoint(31, 25);
        easystar.avoidAdditionalPoint(32, 24);
        //stuck on objects
        easystar.avoidAdditionalPoint(23, 26);
        easystar.avoidAdditionalPoint(26, 26);
        // easystar.avoidAdditionalPoint(18, 24);
        // easystar.avoidAdditionalPoint(45, 23);
        // easystar.avoidAdditionalPoint(31, 41);

        //creating the sprites
        meg = this.physics.add.sprite(200, 200, 'meg_sprites', 'meg_sprite_21.png').setSize(16, 16).setOffset(24, 35); //changed from 25, 25
        meg.setScale(0.8, 0.8);
        trapper = this.physics.add.sprite(64, 64, 'trapper_sprites', 'trapper_sprite_78.png').setSize(16, 16).setOffset(24, 35); //changed from 30, 30 to avoid getting stuck
        trapper.setScale(0.8, 0.8);
        gen = this.physics.add.sprite(510, 360, 'gen').setSize(80, 80).setOffset(10, 250).setImmovable();
        gen.setScale(0.3, 0.3);
        target_object = this.physics.add.sprite(64, 64, 'meg_sprites', 'meg_sprite_21.png').setSize(1, 1);
        target_object.visible = false;

        map.createLayer('Foreground', tiles, 0, 0);

        //create health bar
        var health_text = this.add.text(0, 0, 'Health', { fontSize: '10px', fill: '#000' }).setScrollFactor(0);
        health_bar = this.add.graphics().setScrollFactor(0);
        createHealthBar(health_bar, 100, 12.5, 40, 0, 0x2ecc71);

        // make all tiles in obstacles collidable
        // obstacles.setCollisionByExclusion([-1]);
        obstacles.setCollisionByProperty({collides: true});

        // don't go out of the map
        this.physics.world.bounds.width = map.widthInPixels;
        this.physics.world.bounds.height = map.heightInPixels;
        meg.setCollideWorldBounds(true);
        trapper.setCollideWorldBounds(true);

        // don't walk on trees
        this.physics.add.collider(meg, obstacles);
        this.physics.add.collider(trapper, obstacles);

        this.physics.add.collider(meg, gen);
        this.physics.add.collider(trapper, gen);

        //highlight collision areas of a layer
        // const debugGraphics = this.add.graphics().setAlpha(0.7);
        // showCollisionAreas(obstacles, debugGraphics);

        // limit camera to map
        // this.cameras.main.setBounds(0, 0, 120, 80);
        this.cameras.main.startFollow(meg);
        this.cameras.main.setSize(360, 240);
        this.cameras.main.setPosition(60, 60);
        // this.cameras.main.roundPixels = true; // avoid tile bleed

        cursors = this.input.keyboard.createCursorKeys();
        wasd = {
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
            key: 'meg-stand-left',
            frames: megStandLeftFrameNames,
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

    function createHealthBar(bar, size_x, size_y, position_x, position_y, color) {
        bar.fillStyle(color, 1);
        bar.fillRect(0, 0, size_x, size_y);
        bar.x = position_x;
        bar.y = position_y;
        return bar;
    }

    function update(time, delta) {
        //update_timer runs easystar path algorithm every x update triggers (roughly 60 update triggers/sec)
        //need to tweak update_timer and moveToObject speed parameters for better ai 
        easystar.enableDiagonals();
        // easystar.enableCornerCutting();
        easystar.setIterationsPerCalculation(6000);
        if(update_timer === 50) {
            update_timer = 0;
            easystar.findPath(Math.floor(trapper.x/16), Math.floor(trapper.y/16), Math.floor(meg.x/16), Math.floor(meg.y/16), (path) => {
                if(path === null) {
                    console.log("Path was not found");
                }
                else {
                    for(let i = 1; i < 3; i++) {
                        target_object.x = path[i].x*16;
                        target_object.y = path[i].y*16;
                        this.physics.moveToObject(trapper, target_object, 150);
                    }
                    if(path[1].x > trapper.x/16 + 0.5) {
                        trapper.flipX = true;
                        trapper.anims.play('trapper-walk-left', true);
                        trapper_last_direction = "right";
                    }
                    else if(path[1].x < trapper.x/16 - 0.5) {
                        trapper.flipX = false;
                        trapper.anims.play('trapper-walk-left', true);
                        trapper_last_direction = "left";
                    }
                    else if(path[1].y < trapper.y/16) {
                        trapper.anims.play('trapper-walk-up', true);
                        trapper_last_direction = "up";
                    }
                    else if(path[1].y > trapper.y/16) {
                        trapper.anims.play('trapper-walk-down', true);
                        trapper_last_direction = "down";
                    }
                }
            });
            easystar.calculate();
        }

        if(Math.abs(meg.x - trapper.x) < 16 && Math.abs(meg.y - trapper.y) < 16) {
            trapper.setVelocityX(0);
            trapper.setVelocityY(0);
            if(trapper_last_direction === "up") {
                trapper.anims.play('trapper-attack-up', true);
            }
            else if(trapper_last_direction === "down") {
                trapper.anims.play('trapper-attack-down', true);
            }
            else if(trapper_last_direction === "right") {
                trapper.flipX = true;
                trapper.anims.play('trapper-attack-left', true);
            }
            else {
                trapper.flipX = false;
                trapper.anims.play('trapper-attack-left', true);
            }

            //adds damage quicker with lower attack_timer value
            if(attack_timer === 50) {
                attack_timer = 0;
                health_bar.scaleX -= 0.1;
                health_bar.scaleX = Math.floor(health_bar.scaleX * 100) / 100; //rounding to two decimals
                if(health_bar.scaleX === 0.3) {
                    health_bar.destroy();
                    health_bar = this.add.graphics().setScrollFactor(0);
                    createHealthBar(health_bar, 100, 12.5, 40, 0, 0xC62520);
                    health_bar.scaleX = 0.3;
                }
                else if(health_bar.scaleX === 0.6) {
                    health_bar.destroy();
                    health_bar = this.add.graphics().setScrollFactor(0);
                    createHealthBar(health_bar, 100, 12.5, 40, 0, 0xFEF60F);
                    health_bar.scaleX = 0.6;
                }
            }
            attack_timer++;
        }

        //sets game over screen when health reaches 0
        if(health_bar.scaleX <= 0.0) {
            var game_over_text = this.add.text(100, 100, 'Game Over', { fontSize: '32px', fill: '#E92416'}).setScrollFactor(0);
            var restart_text = this.add.text(80, 130, 'Press Space to continue', { fontSize: '16px', fill: '#000000'}).setScrollFactor(0);
            meg.setTint(0xff0000);
            this.physics.pause();
            health_bar.destroy();
            var continue_button = {
                space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
            }
            if(continue_button.space.isDown) {
                this.scene.restart();
            }
        }

        update_timer++;
        meg.setVelocity(0);

        if(cursors.right.isDown || wasd.right.isDown) {
            meg.setVelocityX(200);
            meg.body.velocity.normalize().scale(200);
        }
        else if(cursors.left.isDown || wasd.left.isDown) {
            meg.setVelocityX(-200);
            meg.body.velocity.normalize().scale(200);
        }

        if(cursors.up.isDown || wasd.up.isDown) {
            meg.setVelocityY(-200);
            meg.body.velocity.normalize().scale(200);
        }
        else if(cursors.down.isDown || wasd.down.isDown) {
            meg.setVelocityY(200);
            meg.body.velocity.normalize().scale(200);
        }

        // Update the animation last and give left/right animations precedence over up/down animations
        if (cursors.left.isDown || wasd.left.isDown)
        {
            meg.anims.play('meg-walk-left', true);
            meg.flipX = false;
            meg_last_direction = "left";
        }
        else if (cursors.right.isDown || wasd.right.isDown)
        {
            meg.anims.play('meg-walk-left', true);
            meg.flipX = true;
            meg_last_direction = "right";
        }
        else if (cursors.up.isDown || wasd.up.isDown)
        {
            meg.anims.play('meg-walk-up', true);
            meg_last_direction = "up";
        }
        else if (cursors.down.isDown || wasd.down.isDown)
        {
            meg.anims.play('meg-walk-down', true);
            meg_last_direction = "down";
        }
        else
        {
            if(meg_last_direction === "right") {
                meg.flipX = true;
                meg.anims.play('meg-stand-left', true);
            }
            else if(meg_last_direction === "left") {
                meg.anims.play('meg-stand-left', true);
            }
            else if(meg_last_direction === "up") {
                meg.anims.play('meg-stand-up', true);
            }
            else if(meg_last_direction === "down") {
                meg.anims.play('meg-stand-down', true);
            }
        }
    }