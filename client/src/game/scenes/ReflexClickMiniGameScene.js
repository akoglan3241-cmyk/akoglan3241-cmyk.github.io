/**
 * Reflex Click Mini-Game
 * Hızlı tıklama oyunu - Reaksiyon testi
 */

class ReflexClickMiniGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ReflexClickMiniGameScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Arka plan
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);
    
    // Başlık
    this.add.text(width / 2, 40, 'Hızlı Tıklama!', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width / 2, 75, 'Skor: 0', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.timerText = this.add.text(width / 2, 105, 'Süre: 10s', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ff6b6b'
    }).setOrigin(0.5);

    this.instructionsText = this.add.text(width / 2, 135, 'Hızlıca tıkla!', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    // Ana tıklama butonu
    this.clickButton = this.add.circle(width / 2, height / 2, 100, 0xe94560)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(5, 0xffffff);

    this.clickButtonText = this.add.text(width / 2, height / 2, 'TIKLA!', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Geri dönüş butonu
    const backButton = this.add.text(20, height - 30, '← Geri Dön', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#6c5ce7',
      padding: { x: 15, y: 8 }
    }).setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
      this.scene.start('TownScene');
    });

    // Oyun değişkenleri
    this.score = 0;
    this.timeLeft = 10;
    this.gameStarted = false;
    this.clickSpeed = [];

    // Buton tıklama eventi
    this.clickButton.on('pointerdown', () => this.handleClick());

    // Zamanlayıcı (oyun başladıktan sonra)
    this.timerEvent = null;

    // Başlangıç animasyonu
    this.tweens.add({
      targets: this.clickButton,
      scale: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  handleClick() {
    if (!this.gameStarted) {
      // Oyunu başlat
      this.startGame();
      return;
    }

    // Skor artır
    this.score++;
    this.scoreText.setText(`Skor: ${this.score}`);

    // Buton animasyonu
    this.tweens.add({
      targets: this.clickButton,
      scale: 0.95,
      duration: 50,
      yoyo: true,
      ease: 'Power2'
    });

    // Rastgele renk değişimi
    const randomColor = Math.random() * 0xffffff;
    this.clickButton.setFillStyle(randomColor);

    // Parçacık efekti
    this.createParticles(this.clickButton.x, this.clickButton.y);

    // Tıklama hızı kaydı
    this.clickSpeed.push(Date.now());
    
    // Son 5 tıklamanın hızını hesapla
    if (this.clickSpeed.length > 5) {
      this.clickSpeed.shift();
    }
  }

  startGame() {
    this.gameStarted = true;
    this.instructionsText.setText('🔥 HIZLI TIKLA! 🔥');
    
    // İlk tıklamada butonu küçült
    this.clickButton.setScale(0.95);

    // Zamanlayıcıyı başlat
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });

    // Başlangıç efekti
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 50, () => {
        this.createParticles(this.clickButton.x, this.clickButton.y);
      });
    }
  }

  createParticles(x, y) {
    const particles = this.add.particles(x, y, 'particles', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 400,
      quantity: 3,
      tint: [0xffd700, 0xff6b6b, 0x00ff88]
    });

    // Partikülleri 400ms sonra yok et
    this.time.delayedCall(400, () => {
      particles.destroy();
    });
  }

  updateTimer() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      this.timerText.setText(`Süre: ${this.timeLeft}s`);

      // Son saniyelerde uyarı
      if (this.timeLeft <= 3) {
        this.timerText.setColor('#ff0000');
        this.timerText.setFontStyle('bold');
      }

      if (this.timeLeft === 0) {
        this.endGame();
      }
    }
  }

  endGame() {
    this.gameStarted = false;
    if (this.timerEvent) {
      this.timerEvent.remove();
    }

    // Tıklama hızı istatistikleri
    let clicksPerSecond = 0;
    if (this.clickSpeed.length >= 2) {
      const timeSpan = (this.clickSpeed[this.clickSpeed.length - 1] - this.clickSpeed[0]) / 1000;
      clicksPerSecond = ((this.clickSpeed.length - 1) / timeSpan).toFixed(2);
    }

    // Sonuç ekranı
    const resultContainer = this.add.container(this.scale.width / 2, this.scale.height / 2);
    
    const background = this.add.rectangle(0, 0, 400, 300, 0x2d1b4e)
      .setStrokeStyle(4, 0xffffff);
    
    const titleText = this.add.text(0, -100, 'OYUN BİTTİ!', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ff6b6b',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const scoreLabel = this.add.text(0, -40, `Toplam Skor: ${this.score}`, {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffd700'
    }).setOrigin(0.5);

    const cpsLabel = this.add.text(0, 0, `Tıklama Hızı: ${clicksPerSecond}/s`, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#00ff88'
    }).setOrigin(0.5);

    let rankText = 'Başlangıç';
    let rewardCoins = 0;
    if (this.score >= 50) {
      rankText = '⚡ HIZ USTASI ⚡';
      rewardCoins = 50;
    } else if (this.score >= 35) {
      rankText = '🎯 Çok Hızlı';
      rewardCoins = 30;
    } else if (this.score >= 20) {
      rankText = '👍 İyi';
      rewardCoins = 15;
    } else if (this.score >= 10) {
      rankText = '🙂 Fena Değil';
      rewardCoins = 5;
    }

    const rankLabel = this.add.text(0, 50, rankText, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ff9ff3',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const rewardLabel = this.add.text(0, 90, `+${rewardCoins} Coin Kazandın!`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffd700'
    }).setOrigin(0.5);

    resultContainer.add([background, titleText, scoreLabel, cpsLabel, rankLabel, rewardLabel]);

    // Socket ile sunucuya bildirim gönder
    if (this.socket) {
      this.socket.emit('minigame:scoreSubmit', {
        gameType: 'reflex_click',
        miniGameId: 'reflex_click',
        score: this.score,
        clicksPerSecond: parseFloat(clicksPerSecond) || 0
      });
    }

    // 4 saniye sonra town scene'e dön
    this.time.delayedCall(4000, () => {
      this.scene.start('TownScene');
    });
  }

  init(data) {
    this.socket = data.socket || null;
  }
}

export { ReflexClickMiniGameScene };
