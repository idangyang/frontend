class DanmakuEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.danmakus = [];
    this.running = false;
    this.paused = false;
    this.tracks = []; // 弹幕轨道
    this.trackHeight = 30; // 每条轨道的高度
    this.fontSize = 24;
    this.speed = 3; // 弹幕速度

    // 创建按钮容器
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.className = 'voice-danmaku-buttons';
    this.buttonContainer.style.position = 'absolute';
    this.buttonContainer.style.top = '0';
    this.buttonContainer.style.left = '0';
    this.buttonContainer.style.width = '100%';
    this.buttonContainer.style.height = '100%';
    this.buttonContainer.style.pointerEvents = 'none';
    this.buttonContainer.style.zIndex = '10';
    this.canvas.parentElement.appendChild(this.buttonContainer);
  }

  init() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;

    // 计算可以容纳多少条轨道
    const trackCount = Math.floor(this.canvas.height / this.trackHeight);
    this.tracks = new Array(trackCount).fill(null).map(() => ({
      lastDanmakuTime: 0,
      lastDanmakuX: this.canvas.width
    }));
  }

  // 找到一个可用的轨道
  findAvailableTrack(textWidth) {
    const now = Date.now();

    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      // 检查这条轨道是否有足够的空间
      // 如果上一条弹幕已经移动了足够远，或者时间间隔足够长
      const timeSinceLastDanmaku = now - track.lastDanmakuTime;
      const minDistance = textWidth + 50; // 最小间距

      if (track.lastDanmakuX < this.canvas.width - minDistance || timeSinceLastDanmaku > 3000) {
        return i;
      }
    }

    // 如果所有轨道都满了，返回第一条轨道（会重叠）
    return 0;
  }

  add(text, color = '#FFFFFF', type = 'scroll', isVoice = false, audioUrl = null) {
    // 测量文本宽度（语音弹幕需要额外空间显示播放按钮）
    this.ctx.font = `${this.fontSize}px Arial`;
    const textWidth = this.ctx.measureText(text).width;
    const totalWidth = isVoice ? textWidth + 40 : textWidth;

    // 找到可用的轨道
    const trackIndex = this.findAvailableTrack(totalWidth);

    const danmaku = {
      text,
      color,
      type,
      x: this.canvas.width,
      y: trackIndex * this.trackHeight + this.trackHeight / 2 + this.fontSize / 2,
      speed: this.speed,
      fontSize: this.fontSize,
      opacity: 1,
      textWidth: totalWidth,
      trackIndex,
      isVoice,
      audioUrl,
      audio: null,
      button: null,
      isPlaying: false
    };

    // 如果是语音弹幕，创建音频和按钮
    if (isVoice && audioUrl) {
      danmaku.audio = new Audio(`http://localhost:5002${audioUrl}`);
      danmaku.button = this.createVoiceButton(danmaku);
    }

    this.danmakus.push(danmaku);

    // 更新轨道信息
    this.tracks[trackIndex].lastDanmakuTime = Date.now();
    this.tracks[trackIndex].lastDanmakuX = this.canvas.width;
  }

  createVoiceButton(danmaku) {
    const button = document.createElement('button');
    button.className = 'voice-play-button';
    button.style.position = 'absolute';
    button.style.width = '24px';
    button.style.height = '24px';
    button.style.borderRadius = '50%';
    button.style.background = '#FF4444';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.pointerEvents = 'auto';
    button.style.transition = 'transform 0.2s';
    button.style.zIndex = '20';
    button.style.padding = '0';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';

    // 创建播放图标（三角形）
    const icon = document.createElement('div');
    icon.className = 'play-icon';
    icon.style.width = '0';
    icon.style.height = '0';
    icon.style.borderLeft = '8px solid white';
    icon.style.borderTop = '5px solid transparent';
    icon.style.borderBottom = '5px solid transparent';
    icon.style.marginLeft = '2px';
    button.appendChild(icon);

    // 鼠标悬停效果
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.2)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });

    // 点击播放/暂停
    button.addEventListener('click', (e) => {
      e.stopPropagation();

      if (danmaku.isPlaying) {
        // 暂停
        danmaku.audio.pause();
        danmaku.isPlaying = false;
        // 变回三角形
        icon.style.width = '0';
        icon.style.height = '0';
        icon.style.borderLeft = '8px solid white';
        icon.style.borderTop = '5px solid transparent';
        icon.style.borderBottom = '5px solid transparent';
        icon.style.marginLeft = '2px';
        icon.style.borderRadius = '0';
      } else {
        // 播放
        danmaku.audio.play().catch(err => {
          console.error('播放音频失败:', err);
        });
        danmaku.isPlaying = true;
        // 变成正方形
        icon.style.width = '8px';
        icon.style.height = '8px';
        icon.style.borderLeft = 'none';
        icon.style.borderTop = 'none';
        icon.style.borderBottom = 'none';
        icon.style.background = 'white';
        icon.style.marginLeft = '0';
        icon.style.borderRadius = '1px';
      }
    });

    // 音频播放结束时重置状态
    danmaku.audio.addEventListener('ended', () => {
      danmaku.isPlaying = false;
      icon.style.width = '0';
      icon.style.height = '0';
      icon.style.borderLeft = '8px solid white';
      icon.style.borderTop = '5px solid transparent';
      icon.style.borderBottom = '5px solid transparent';
      icon.style.marginLeft = '2px';
      icon.style.background = 'transparent';
      icon.style.borderRadius = '0';
    });

    this.buttonContainer.appendChild(button);
    return button;
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.danmakus = this.danmakus.filter(danmaku => {
      // 只有在非暂停状态下才移动弹幕
      if (!this.paused) {
        danmaku.x -= danmaku.speed;

        // 更新轨道信息
        if (this.tracks[danmaku.trackIndex]) {
          this.tracks[danmaku.trackIndex].lastDanmakuX = danmaku.x;
        }
      }

      // 更新语音弹幕按钮位置
      if (danmaku.isVoice && danmaku.button) {
        const buttonX = danmaku.x;
        const buttonY = danmaku.y - this.fontSize / 2;
        danmaku.button.style.left = `${buttonX}px`;
        danmaku.button.style.top = `${buttonY}px`;
      }

      // 绘制弹幕
      if (danmaku.isVoice) {
        this.drawVoiceDanmaku(danmaku);
      } else {
        this.drawTextDanmaku(danmaku);
      }

      // 当弹幕完全移出屏幕左侧时移除
      const shouldKeep = danmaku.x + danmaku.textWidth > 0;

      // 如果弹幕要被移除，清理按钮
      if (!shouldKeep && danmaku.isVoice && danmaku.button) {
        this.buttonContainer.removeChild(danmaku.button);
        danmaku.button = null;
        if (danmaku.audio) {
          danmaku.audio.pause();
          danmaku.audio = null;
        }
      }

      return shouldKeep;
    });

    if (this.running) {
      requestAnimationFrame(() => this.render());
    }
  }

  start() {
    this.running = true;
    this.render();
  }

  // 绘制普通文本弹幕
  drawTextDanmaku(danmaku) {
    this.ctx.font = `bold ${danmaku.fontSize}px Arial`;
    this.ctx.fillStyle = danmaku.color;
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.globalAlpha = danmaku.opacity;

    // 描边（黑色边框）
    this.ctx.strokeText(danmaku.text, danmaku.x, danmaku.y);
    // 填充文字
    this.ctx.fillText(danmaku.text, danmaku.x, danmaku.y);
  }

  // 绘制语音弹幕（只绘制文本，按钮由 DOM 元素处理）
  drawVoiceDanmaku(danmaku) {
    const buttonSize = 24;
    const padding = 8;
    const textX = danmaku.x + buttonSize + padding;

    // 绘制文本
    this.ctx.globalAlpha = danmaku.opacity;
    this.ctx.font = `bold ${danmaku.fontSize}px Arial`;
    this.ctx.fillStyle = danmaku.color;
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';

    this.ctx.strokeText(danmaku.text, textX, danmaku.y);
    this.ctx.fillText(danmaku.text, textX, danmaku.y);
  }

  stop() {
    this.running = false;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  clear() {
    this.danmakus = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // 重置轨道
    this.tracks = this.tracks.map(() => ({
      lastDanmakuTime: 0,
      lastDanmakuX: this.canvas.width
    }));
  }

}

export default DanmakuEngine;
