import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('preload-scene');
    }

    preload() {
    }

    create() {
        var welcome_text = this.add.text(130, 100, 'Welcome', { fontSize: '32px', fill: '#ffffff'}).setScrollFactor(0);
        var continue_text = this.add.text(80, 130, 'Press Space to continue', { fontSize: '16px', fill: '#ffffff'}).setScrollFactor(0);
    }

    update() {
        var continue_button = {
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        }
        if(continue_button.space.isDown) {
            this.scene.start('game');
        }
    }
}