import Phaser from "phaser";

function spawnBurst(scene, x, y, color, count = 5, spread = 22, duration = 360) {
  const particles = Array.from({ length: count }, () =>
    scene.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.95).setDepth(y + 40),
  );

  particles.forEach((particle) => {
    scene.tweens.add({
      targets: particle,
      x: x + Phaser.Math.Between(-spread, spread),
      y: y + Phaser.Math.Between(-spread, spread),
      alpha: 0,
      scale: 0.5,
      duration,
      ease: "Quad.easeOut",
      onComplete: () => particle.destroy(),
    });
  });
}

export function createWorldFx(scene) {
  let lastDustAt = 0;

  return {
    spawnPickupSparkle(x, y) {
      spawnBurst(scene, x, y - 10, 0xffe7a3, 6, 16, 320);
    },
    spawnChestBurst(x, y) {
      spawnBurst(scene, x, y - 8, 0xffbf64, 7, 24, 380);
    },
    spawnWalkDust(x, y, isSprinting = false) {
      const now = scene.time.now;
      const interval = isSprinting ? 80 : 135;
      if (now - lastDustAt < interval) {
        return;
      }

      lastDustAt = now;
      const dust = scene.add.ellipse(x, y + 10, isSprinting ? 10 : 8, isSprinting ? 6 : 5, 0xdcc39b, 0.4).setDepth(y + 2);
      scene.tweens.add({
        targets: dust,
        y: y + 4,
        alpha: 0,
        scaleX: 1.25,
        scaleY: 0.85,
        duration: isSprinting ? 220 : 280,
        onComplete: () => dust.destroy(),
      });
    },

    createSunbeams(options = {}) {
      const count = options.count ?? 5;
      const color = options.color ?? 0xfff9e0;
      const alpha = options.alpha ?? 0.12;
      const beams = [];

      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(-100, 1200);
        const y = Phaser.Math.Between(-100, 400);
        const width = Phaser.Math.Between(40, 120);
        const height = Phaser.Math.Between(600, 1200);

        const beam = scene.add.rectangle(x, y, width, height, color, alpha)
          .setRotation(Phaser.Math.DegToRad(35))
          .setOrigin(0.5, 0)
          .setScrollFactor(0.2)
          .setDepth(5000)
          .setBlendMode(Phaser.BlendModes.ADD);

        scene.tweens.add({
          targets: beam,
          alpha: alpha * 0.4,
          duration: Phaser.Math.Between(3000, 6000),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay: Phaser.Math.Between(0, 3000)
        });

        beams.push(beam);
      }

      return {
        destroy() {
          beams.forEach(b => b.destroy());
        }
      };
    },

    createLeaves(options = {}) {
      const count = options.count ?? 12;
      const colors = [0x91b53e, 0x5a9e49, 0xb5a63e, 0x8a7354];
      const leaves = [];

      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(0, 2000);
        const y = Phaser.Math.Between(-200, 1000);
        const color = colors[Phaser.Math.Between(0, colors.length - 1)];

        const leaf = scene.add.ellipse(x, y, 6, 4, color, 0.7)
          .setDepth(y + 200)
          .setScrollFactor(1);

        scene.tweens.add({
          targets: leaf,
          x: x - Phaser.Math.Between(200, 400),
          y: y + Phaser.Math.Between(100, 300),
          rotation: Phaser.Math.DegToRad(360),
          duration: Phaser.Math.Between(4000, 8000),
          repeat: -1,
          ease: "Linear",
          onRepeat: () => {
            leaf.x = x + Phaser.Math.Between(200, 400);
            leaf.y = y - Phaser.Math.Between(100, 200);
          }
        });

        // Flutter effect
        scene.tweens.add({
          targets: leaf,
          scaleX: 0.2,
          duration: Phaser.Math.Between(400, 800),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });

        leaves.push(leaf);
      }

      return {
        destroy() {
          leaves.forEach(l => l.destroy());
        }
      };
    },

    createShadow(target, options = {}) {
      const width = options.width ?? 32;
      const height = options.height ?? 16;
      const alpha = options.alpha ?? 0.25;
      
      const shadow = scene.add.image(target.x, target.y, "iso-shadow")
        .setOrigin(0.5)
        .setAlpha(alpha)
        .setDepth(target.depth - 1);

      return {
        update() {
          if (!target || !target.active) {
            shadow.destroy();
            return;
          }
          shadow.x = target.x;
          shadow.y = target.y + (options.offsetY ?? 0);
          shadow.setDepth(target.depth - 1);
          
          // Scale shadow if target is "jumping" or has height (fake it)
          if (target.heightOffset) {
            const s = Math.max(0.4, 1 - target.heightOffset / 100);
            shadow.setScale(s);
            shadow.setAlpha(alpha * s);
          }
        },
        destroy() {
          shadow.destroy();
        }
      };
    }
  };
}
