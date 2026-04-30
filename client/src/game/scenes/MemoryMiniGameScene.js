/**
 * Memory Match Mini-Game
 * Kart eslestirme oyunu - Hafiza testi
 */

class MemoryMiniGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MemoryMiniGameScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Arka plan
    this.add.rectangle(0, 0, width, height, 0x2d1b4e).setOrigin(0);
    
    // Baslik
    this.add.text(width / 2, 40, 'Kart Eslestirme', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width / 2, 75, 'Hamle: 0 | Eslesme: 0/8', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.timerText = this.add.text(width / 2, 100, 'Sure: 60s', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#00ff88'
    }).setOrigin(0.5);

    // Kart grid olustur
    this.createCardGrid();

    // Geri donus butonu
    const backButton = this.add.text(20, height - 30, '← Geri Don', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#6c5ce7',
      padding: { x: 15, y: 8 }
    }).setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
      this.scene.start('TownScene');
    });

    // Oyun degiskenleri
    this.moves = 0;
    this.matches = 0;
    this.timeLeft = 60;
    this.flippedCards = [];
    this.canFlip = true;

    // Zamanlayici
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
  }

  createCardGrid() {
    const icons = ['🌟', '🎮', '🎨', '🎵', '🎪', '🎯', '🎲', '🎸'];
    const cardValues = [...icons, ...icons]; // Her ikondan 2 tane
    
    // Karistir
    for (let i = cardValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardValues[i], cardValues[j]] = [cardValues[j], cardValues[i]];
    }

    const startX = this.scale.width / 2 - 160;
    const startY = 150;
    const cardWidth = 70;
    const cardHeight = 90;
    const gapX = 15;
    const gapY = 15;

    this.cards = [];

    for (let i = 0; i < cardValues.length; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      
      const card = this.createCard(x, y, cardValues[i]);
      this.cards.push(card);
    }
  }

  createCard(x, y, value) {
    const group = this.add.container(x, y);
    
    // Kart arkasi
    const back = this.add.rectangle(0, 0, 70, 90, 0x6c5ce7)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    
    // Kart onyu (baslangicta gizli)
    const front = this.add.rectangle(0, 0, 70, 90, 0xffffff)
      .setStrokeStyle(3, 0x00ff88);
    
    const icon = this.add.text(0, 0, value, {
      fontSize: '42px',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    front.setVisible(false);
    icon.setVisible(false);

    group.add([back, front, icon]);
    group.setSize(70, 90);

    // Data sakla
    group.setData('value', value);
    group.setData('flipped', false);
    group.setData('matched', false);
    group.setData('back', back);
    group.setData('front', front);
    group.setData('icon', icon);

    back.on('pointerdown', () => this.flipCard(group));

    return group;
  }

  flipCard(card) {
    if (!this.canFlip || card.getData('flipped') || card.getData('matched')) {
      return;
    }

    const back = card.getData('back');
    const front = card.getData('front');
    const icon = card.getData('icon');

    // Kart cevir
    back.setVisible(false);
    front.setVisible(true);
    icon.setVisible(true);
    card.setData('flipped', true);

    this.flippedCards.push(card);

    // 2 kart acildiysa kontrol et
    if (this.flippedCards.length === 2) {
      this.moves++;
      this.updateScore();
      this.canFlip = false;
      this.checkMatch();
    }
  }

  checkMatch() {
    const [card1, card2] = this.flippedCards;
    const value1 = card1.getData('value');
    const value2 = card2.getData('value');

    if (value1 === value2) {
      // Eslesme!
      card1.setData('matched', true);
      card2.setData('matched', true);
      this.matches++;
      this.updateScore();
      this.flippedCards = [];
      this.canFlip = true;

      // Kazanma kontrolu
      if (this.matches === 8) {
        this.gameWon();
      }
    } else {
      // Eslesme yok, geri cevir
      this.time.delayedCall(1000, () => {
        this.flipBack(card1);
        this.flipBack(card2);
        this.flippedCards = [];
        this.canFlip = true;
      });
    }
  }

  flipBack(card) {
    const back = card.getData('back');
    const front = card.getData('front');
    const icon = card.getData('icon');

    back.setVisible(true);
    front.setVisible(false);
    icon.setVisible(false);
    card.setData('flipped', false);
  }

  updateScore() {
    this.scoreText.setText(`Hamle: ${this.moves} | Eslesme: ${this.matches}/8`);
  }

  updateTimer() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      this.timerText.setText(`Sure: ${this.timeLeft}s`);

      if (this.timeLeft === 0) {
        this.gameOver();
      }
    }
  }

  gameWon() {
    this.canFlip = false;
    
    const winText = this.add.text(this.scale.width / 2, this.scale.height / 2, 
      'TEBRIKLER!\nTum kartlari eslestirdin!', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#00ff88',
        align: 'center',
        backgroundColor: '#2d1b4e',
        padding: { x: 30, y: 20 }
      }).setOrigin(0.5);

    // Odul ekle
    this.add.text(this.scale.width / 2, this.scale.height / 2 + 80, 
      '+50 Coin Kazandin!', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffd700'
      }).setOrigin(0.5);

    // Socket ile sunucuya bildirim gonder
    if (this.socket) {
      this.socket.emit('minigame:scoreSubmit', {
        gameType: 'memory',
        miniGameId: 'memory',
        score: 100 - this.moves,
        timeUsed: 60 - this.timeLeft
      });
    }

    // 3 saniye sonra town scene'e don
    this.time.delayedCall(3000, () => {
      this.scene.start('TownScene');
    });
  }

  gameOver() {
    this.canFlip = false;

    const loseText = this.add.text(this.scale.width / 2, this.scale.height / 2, 
      'SURE DOLDU!\nTekrar dene.', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ff6b6b',
        align: 'center',
        backgroundColor: '#2d1b4e',
        padding: { x: 30, y: 20 }
      }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      this.scene.start('TownScene');
    });
  }

  init(data) {
    this.socket = data.socket || null;
  }
}

export { MemoryMiniGameScene };
