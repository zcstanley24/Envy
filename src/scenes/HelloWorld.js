import 'phaser';

export default class HelloWorld extends Phaser.Scene {
    constructor() {
        super({key: 'hello-world'});
    }

    preload() {
        this.load.multiatlas('meg_sprites', 'assets/meg_spritesheet.json', 'assets');
        this.load.multiatlas('trapper_sprites', 'assets/trapper_spritesheet.json', 'assets');
        this.load.image('bg', 'assets/tile_bg_placeholder.png');
    }
}
