import 'phaser';
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

    var game = new Phaser.Game(config);
    var meg;
    var trapper;
    var cursors;
    var wasd;
    var meg_last_direction;
    var trapper_last_direction;
    var gen;

    function preload() {
        this.load.multiatlas('meg_sprites', 'assets/meg_spritesheet.json', 'assets');
        this.load.multiatlas('trapper_sprites', 'assets/trapper_spritesheet.json', 'assets');
        this.load.image('tiles', 'assets/tiles/westworld.png');
        this.load.image('gen', 'assets/objects/gen.png');
        this.load.tilemapTiledJSON('tilemap', 'assets/tiles/west.json')
    }

    function create() {
        // create the map
        var map = this.make.tilemap({ key: 'tilemap' })

        // first parameter is the name of the tilemap in tiled
        var tiles = map.addTilesetImage('tileset', 'tiles');

        // creating the layers
        map.createLayer('Ground', tiles, 0, 0);
        // map.createLayer('Buildings', tiles, 0, 0);
        var obstacles = map.createLayer('Buildings and Ground', tiles, 0, 0);
        // var obstacles = map.createLayer('Barriers', tiles, 0, 0);

        meg = this.physics.add.sprite(200, 200, 'meg_sprites', 'meg_sprite_21.png').setSize(25, 25).setOffset(20, 40);
        meg.setScale(0.8, 0.8);
        trapper = this.physics.add.sprite(50, 50, 'trapper_sprites', 'trapper_sprite_78.png').setSize(30, 30).setOffset(18, 36);
        trapper.setScale(1, 1);

        map.createLayer('Foreground', tiles, 0, 0);

        gen = this.physics.add.sprite(510, 360, 'gen').setSize(80, 80).setOffset(10, 250).setImmovable();
        gen.setScale(0.3, 0.3);

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

        //use this to test collision areas of a layer
        const debugGraphics = this.add.graphics().setAlpha(0.7);
        showCollisionAreas(obstacles, debugGraphics);

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
    }

    function update(time, delta) {
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

        if (Phaser.Math.Distance.BetweenPoints(meg, trapper) < 80000) {
            if(meg.x - trapper.x >= Math.abs(meg.y - trapper.y) + 20) {
                trapper.setVelocityX(100);
                trapper.setVelocityY(0);
                trapper.flipX = true;
                trapper.anims.play('trapper-walk-left', true);
                trapper_last_direction = "right";
            }
            else if(meg.x - trapper.x <= -Math.abs(meg.y - trapper.y) - 20) {
                trapper.setVelocityX(-100);
                trapper.setVelocityY(0);
                trapper.flipX = false;
                trapper.anims.play('trapper-walk-left', true);
                trapper_last_direction = "left";
            }
            else if(meg.y - trapper.y <= -Math.abs(meg.x - trapper.x) - 20) {
                trapper.setVelocityX(0);
                trapper.setVelocityY(-100);
                trapper.anims.play('trapper-walk-up', true);
                trapper_last_direction = "up";
            }
            else if(meg.y - trapper.y >= Math.abs(meg.x - trapper.x) + 20) {
                trapper.setVelocityX(0);
                trapper.setVelocityY(100);
                trapper.anims.play('trapper-walk-down', true);
                trapper_last_direction = "down";
            }
            else if(Math.abs(meg.y - trapper.y) <= 5) {
                trapper.setVelocityX(0);
                trapper.setVelocityY(0);
                if(trapper_last_direction === "up") {
                    trapper.anims.play('trapper-stand-up', true);
                }
                else if(trapper_last_direction === "down") {
                    trapper.anims.play('trapper-stand-down', true);
                }
                else if(trapper_last_direction === "right") {
                    trapper.flipX = true;
                    trapper.anims.play('trapper-stand-left', true);
                }
                else if(trapper_last_direction === "left") {
                    trapper.flipX = false;
                    trapper.anims.play('trapper-stand-left', true);
                }
            }
            else if(Math.abs(meg.x - trapper.x) <= 5) {
                trapper.setVelocityX(0);
                trapper.setVelocityY(0);
                if(trapper_last_direction === "right") {
                    trapper.flipX = true;
                    trapper.anims.play('trapper-stand-left', true);
                }
                else if(trapper_last_direction === "left") {
                    trapper.flipX = false;
                    trapper.anims.play('trapper-stand-left', true);
                }
                else if(trapper_last_direction === "up") {
                    trapper.anims.play('trapper-stand-up', true);
                }
                else if(trapper_last_direction === "down") {
                    trapper.anims.play('trapper-stand-down', true);
                }
            }
        }
    }