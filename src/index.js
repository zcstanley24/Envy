import 'phaser';

var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create
    }
};

var game = new Phaser.Game(config);

function preload() {
    this.load.multiatlas('cityscene', 'assets/cityscene.json', 'assets');
}

function create () {
    var background = this.add.sprite(0, 0, 'cityscene', 'background.png');
}
