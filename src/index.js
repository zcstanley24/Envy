import 'phaser';

var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {y: 0},
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var capguy;
var cursors;
var background;

function preload() {
    this.load.multiatlas('cityscene', 'assets/cityscene.json', 'assets');
    this.load.image('rocks', 'assets/free_rocks.png');
    
}

function create() {
    background = this.add.tileSprite(0, 0, game.width, game.height, 'rocks');
    background.displayHeight = this.sys.game.config.height;
    background.scaleX = background.scaleY;
    background.x = game.config.width/2;
    background.y = game.config.height/2;
    background.x = background.displayWidth*0.5;

    capguy = this.physics.add.sprite(0, 400, 'cityscene', 'capguy/walk/001.png');
    capguy.setScale(0.5, 0.5);
    capguy.setBounce(0.2);

    cursors = this.input.keyboard.createCursorKeys();

    var walkFrameNames = this.anims.generateFrameNames('cityscene', {
        start: 1, end: 8, zeroPad: 4, prefix: 'capguy/walk/', suffix: '.png'
    });

    var standFrameNames = this.anims.generateFrameNames('cityscene', {
        start: 1, end: 1, zeroPad: 4, prefix: 'capguy/walk/', suffix: '.png'
    });

    this.anims.create({
        key: 'walk',
        frames: walkFrameNames, 
        frameRate: 10, 
        repeat: -1
    });

    this.anims.create({
        key: 'jump',
        frames: standFrameNames, 
        frameRate: 10, 
        repeat: -1
    });

    this.anims.create({
        key: 'stand-still', 
        frames: standFrameNames, 
        frameRate: 10, 
        repeat: -1
    });
}

function update(time, delta) {
    if(capguy.x > 850) {
        capguy.x = -50;
    }
    else if(capguy.x < -50) {
        capguy.x = 850;
    }

    if(cursors.right.isDown) {
        capguy.setVelocityX(300);
        capguy.flipX = false;
        capguy.anims.play('walk', true);
    }
    else if(cursors.left.isDown) {
        capguy.setVelocityX(-300);
        capguy.flipX = true;
        capguy.anims.play('walk', true);
    }
    else {
        capguy.setVelocityX(0);
        capguy.anims.play('stand-still', true);
    }

    if(cursors.up.isDown) {
        capguy.setVelocityY(-300);
        // capguy.anims.play('jump', true);
    }
    else if(cursors.down.isDown) {
        capguy.setVelocityY(300);
        // capguy.anims.play('jump', true);
    }
    else {
        capguy.setVelocityY(0);
    }
}
