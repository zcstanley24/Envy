import Phaser from 'phaser';
import showCollisionAreas from './helper_functions/showCollisionAreas';
import GameScene from './Game';
import MenuScene from './Menu';

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
    scene: [MenuScene, GameScene],
    scale: {
        zoom: 2.5
    }
}

var game = new Phaser.Game(config);