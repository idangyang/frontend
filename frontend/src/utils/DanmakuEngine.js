import { getResourceUrl } from '../config';

class DanmakuEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.danmakus = [];
    this.running = false;
    this.paused = false;
    this.tracks = []; // 弹幕轨道
    this.trackHeight = 50; // 每条轨道的高度
    this.fontSize = 24;
    this.speed = 3; // 弹幕速度
    this.maxWidth = 400; // 弹幕最大宽度，超过则换行
    this.lineHeight = 1; // 行高倍数

    // 悬停相关状态
    this.hoveredDanmaku = null; // 当前悬停的弹幕
    this.actionPanel = null; // 操作面板 DOM 元素
    this.onLikeCallback = null; // 点赞回调
    this.onReportCallback = null; // 举报回调
    this.onDeleteCallback = null; // 删除回调
    this.isPanelHovered = false; // 操作面板是否被悬停
    this.hideTimer = null; // 延迟隐藏定时器

    // 创建卡片容器（z-index 低于 Canvas）
    this.cardContainer = document.createElement('div');
    this.cardContainer.className = 'danmaku-card-container';
    this.cardContainer.style.position = 'absolute';
    this.cardContainer.style.top = '0';
    this.cardContainer.style.left = '0';
    this.cardContainer.style.width = '100%';
    this.cardContainer.style.height = '100%';
    this.cardContainer.style.pointerEvents = 'none';
    this.cardContainer.style.zIndex = '1';
    this.canvas.parentElement.appendChild(this.cardContainer);

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

    // 启用 Canvas 鼠标事件
    this.canvas.style.pointerEvents = 'auto';
    this.setupMouseEvents();
  }

  init() {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;

    // 设置 Canvas 物理分辨率
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // 设置 Canvas CSS 尺寸
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // 缩放绘图上下文
    this.ctx.scale(dpr, dpr);

    // 计算可以容纳多少条轨道
    const trackCount = Math.floor(height / this.trackHeight);
    this.tracks = new Array(trackCount).fill(null).map(() => ({
      lastDanmakuTime: 0,
      lastDanmakuX: width
    }));
  }

  // 设置鼠标事件监听
  setupMouseEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 检测鼠标是否悬停在某个弹幕上
      const hoveredDanmaku = this.getDanmakuAtPosition(mouseX, mouseY);

      if (hoveredDanmaku !== this.hoveredDanmaku) {
        // 悬停状态改变
        if (this.hoveredDanmaku && !this.isPanelHovered) {
          // 只有在不悬停卡片时才恢复之前的弹幕
          this.hoveredDanmaku.isPaused = false;
          this.hideActionPanel();
        }

        this.hoveredDanmaku = hoveredDanmaku;

        if (this.hoveredDanmaku) {
          // 暂停当前悬停的弹幕
          this.hoveredDanmaku.isPaused = true;
          this.showActionPanel(this.hoveredDanmaku);
          this.canvas.style.cursor = 'pointer';
        } else if (!this.isPanelHovered) {
          // 只有在不悬停卡片时才恢复默认光标
          this.canvas.style.cursor = 'default';
        }
      }
    });
  }

  // 将文本分割成多行
  wrapText(text, maxWidth, fontSize) {
    this.ctx.font = `italic bold ${fontSize}px "Microsoft YaHei", "SimHei", sans-serif`;
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i];
      const metrics = this.ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  // 检测指定位置是否有弹幕
  getDanmakuAtPosition(x, y) {
    // 优先检查当前已经悬停的弹幕，扩大其判定范围到整个卡片区域
    // 这样可以防止鼠标在移动到按钮的过程中因为离开文字区域而导致面板消失
    if (this.hoveredDanmaku) {
      const d = this.hoveredDanmaku;
      const lineHeight = d.fontSize * this.lineHeight;
      const totalTextHeight = d.lines.length * lineHeight;

      const cardX = d.x - 12;
      const cardY = d.y - d.fontSize - 10;
      const cardWidth = d.textWidth + 24;
      // 这里的 cardHeight 必须与 showActionPanel 中的逻辑保持一致
      const cardHeight = totalTextHeight + 82;

      if (x >= cardX && x <= cardX + cardWidth && y >= cardY && y <= cardY + cardHeight) {
        return d;
      }
    }

    // 从后往前遍历（后面的弹幕在上层）
    for (let i = this.danmakus.length - 1; i >= 0; i--) {
      const danmaku = this.danmakus[i];

      // 计算弹幕的边界框（支持多行）
      const lineHeight = danmaku.fontSize * this.lineHeight;
      const totalHeight = danmaku.lines.length * lineHeight;
      const textTop = danmaku.y - danmaku.fontSize;
      const textBottom = textTop + totalHeight;
      const textLeft = danmaku.x;
      const textRight = danmaku.x + danmaku.textWidth;

      // 检测鼠标是否在文字边界框内
      if (x >= textLeft && x <= textRight && y >= textTop && y <= textBottom) {
        return danmaku;
      }
    }
    return null;
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

  // 显示操作面板（卡片式）
  showActionPanel(danmaku) {
    if (!danmaku.id) return; // 没有 ID 的弹幕不显示操作面板

    // 创建卡片背景
    if (!this.actionPanelBg) {
      this.actionPanelBg = document.createElement('div');
      this.actionPanelBg.className = 'danmaku-action-card-bg';
      this.actionPanelBg.style.position = 'absolute';
      this.actionPanelBg.style.pointerEvents = 'auto';
      this.cardContainer.style.pointerEvents = 'auto'; // 允许卡片容器接收事件
      this.cardContainer.appendChild(this.actionPanelBg);

      // 添加卡片背景的鼠标事件监听
      this.actionPanelBg.addEventListener('mouseenter', () => {
        this.isPanelHovered = true;
      });

      this.actionPanelBg.addEventListener('mouseleave', () => {
        this.isPanelHovered = false;
        // 鼠标离开卡片时，隐藏面板并恢复弹幕
        if (this.hoveredDanmaku) {
          this.hoveredDanmaku.isPaused = false;
          this.hoveredDanmaku = null;
          this.hideActionPanel();
          this.canvas.style.cursor = 'default';
        }
      });
    }

    // 创建按钮容器
    if (!this.actionPanel) {
      this.actionPanel = document.createElement('div');
      this.actionPanel.className = 'danmaku-action-buttons';
      this.actionPanel.style.position = 'absolute';
      this.actionPanel.style.pointerEvents = 'auto';
      this.buttonContainer.appendChild(this.actionPanel);

      // 添加按钮容器的鼠标事件监听
      this.actionPanel.addEventListener('mouseenter', () => {
        this.isPanelHovered = true;
      });

      this.actionPanel.addEventListener('mouseleave', () => {
        this.isPanelHovered = false;
        // 鼠标离开按钮时，隐藏面板并恢复弹幕
        if (this.hoveredDanmaku) {
          this.hoveredDanmaku.isPaused = false;
          this.hoveredDanmaku = null;
          this.hideActionPanel();
          this.canvas.style.cursor = 'default';
        }
      });
    }

    // 计算卡片位置和尺寸（包裹弹幕）
    const lineHeight = danmaku.fontSize * this.lineHeight;
    const totalTextHeight = danmaku.lines.length * lineHeight;

    const cardX = danmaku.x - 12; // 左侧留出边距
    // 将 cardY 的偏移从 -12 改为 -10，使卡片整体下移一点（y 轴正方向）
    const cardY = danmaku.y - danmaku.fontSize - 10;
    const cardWidth = danmaku.textWidth + 24; // 宽度匹配弹幕文本加边距
    // 增加卡片高度，以确保底部留白充足且与顶部协调，与 getDanmakuAtPosition 逻辑一致
    const cardHeight = totalTextHeight + 82;

    // 设置卡片背景位置和样式
    this.actionPanelBg.style.left = `${cardX}px`;
    this.actionPanelBg.style.top = `${cardY}px`;
    this.actionPanelBg.style.width = `${cardWidth}px`;
    this.actionPanelBg.style.height = `${cardHeight}px`;
    this.actionPanelBg.style.display = 'block';

    // 设置按钮容器位置（在卡片底部）
    // 调整按钮的垂直位置，使其与文字和底部的间距更均衡
    const buttonY = cardY + totalTextHeight + 24;
    this.actionPanel.style.left = `${cardX}px`;
    this.actionPanel.style.top = `${buttonY}px`;
    this.actionPanel.style.width = `${cardWidth}px`;
    this.actionPanel.style.display = 'flex';

    // 清空并重新创建按钮
    this.actionPanel.innerHTML = '';

    // 点赞按钮
    const likeBtn = this.createActionButton(
      'like',
      `${danmaku.likes || 0}`,
      () => {
        if (this.onLikeCallback) {
          this.onLikeCallback(danmaku.id);
        }
      },
      danmaku.isLiked // 传入当前点赞状态
    );

    // 复制按钮
    const copyBtn = this.createActionButton(
      'copy',
      '',
      () => {
        navigator.clipboard.writeText(danmaku.text).then(() => {
          // 显示复制成功提示
          this.showToast('已复制到剪贴板');
        }).catch(err => {
          console.error('复制失败:', err);
        });
      }
    );

    // 举报按钮
    const reportBtn = this.createActionButton(
      'report',
      '',
      () => {
        if (this.onReportCallback) {
          this.onReportCallback(danmaku.id);
        }
      }
    );

    // 将按钮直接添加到按钮容器
    this.actionPanel.appendChild(likeBtn);
    this.actionPanel.appendChild(copyBtn);
    this.actionPanel.appendChild(reportBtn);

    // 如果是自己发送的弹幕，显示删除按钮
    if (danmaku.isOwner) {
      const deleteBtn = this.createActionButton(
        'delete',
        '',
        () => {
          if (this.onDeleteCallback) {
            this.onDeleteCallback(danmaku.id);
          }
        }
      );
      this.actionPanel.appendChild(deleteBtn);
    }
  }

  // 隐藏操作面板
  hideActionPanel() {
    if (this.actionPanel) {
      this.actionPanel.style.display = 'none';
    }
    if (this.actionPanelBg) {
      this.actionPanelBg.style.display = 'none';
    }
  }

  // 创建操作按钮
  createActionButton(type, text, onClick, isActive = false) {
    const button = document.createElement('button');
    button.className = `danmaku-action-btn danmaku-action-btn-${type} ${isActive ? 'active' : ''}`;

    // 创建 SVG 图标
    let svgIcon = '';
    if (type === 'like') {
      // 点赞图标（心形）
      svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>`;
    } else if (type === 'copy') {
      // 复制图标
      svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>`;
    } else if (type === 'report') {
      // 举报图标（警告标志）
      svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`;
    } else if (type === 'delete') {
      // 删除图标（垃圾桶）
      svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>`;
    }

    button.innerHTML = svgIcon;

    // 如果是点赞按钮且有点赞数，添加数字显示
    if (type === 'like' && text) {
      const countSpan = document.createElement('span');
      countSpan.className = 'danmaku-action-count';
      countSpan.textContent = text;
      button.appendChild(countSpan);
    }

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });

    return button;
  }

  // 显示提示消息
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'danmaku-toast';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '50%';
    toast.style.left = '50%';
    toast.style.transform = 'translate(-50%, -50%)';
    toast.style.zIndex = '1000';

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }

  // 设置回调函数
  setCallbacks(onLike, onReport, onDelete) {
    this.onLikeCallback = onLike;
    this.onReportCallback = onReport;
    this.onDeleteCallback = onDelete;
  }

  add(text, color = '#FFFFFF', type = 'scroll', isVoice = false, audioUrl = null, likes = 0, id = null, isLiked = false, isOwner = false) {
    // 根据点赞数计算字号：每10个赞增加1个字号
    const calculatedFontSize = this.fontSize + Math.floor(likes / 10);

    // 将文本分割成多行
    const lines = this.wrapText(text, this.maxWidth, calculatedFontSize);

    // 计算最大行宽
    this.ctx.font = `italic bold ${calculatedFontSize}px "Microsoft YaHei", "SimHei", sans-serif`;
    let maxLineWidth = 0;
    lines.forEach(line => {
      const lineWidth = this.ctx.measureText(line).width;
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
      }
    });

    // 语音弹幕需要额外空间显示播放按钮
    const totalWidth = isVoice ? maxLineWidth + 40 : maxLineWidth;

    // 找到可用的轨道
    const trackIndex = this.findAvailableTrack(totalWidth);

    const danmaku = {
      id,
      text,
      lines, // 存储分割后的多行文本
      color,
      type,
      x: this.canvas.width,
      y: trackIndex * this.trackHeight + this.trackHeight / 2 + calculatedFontSize / 2,
      speed: this.speed,
      fontSize: calculatedFontSize,
      opacity: 1,
      textWidth: totalWidth,
      trackIndex,
      isVoice,
      audioUrl,
      audio: null,
      button: null,
      isPlaying: false,
      likes,
      isLiked, // 记录当前用户是否已点赞
      isOwner, // 记录是否是自己发送的弹幕
      isPaused: false // 悬停暂停状态
    };

    // 如果是语音弹幕，创建音频和按钮
    if (isVoice && audioUrl) {
      danmaku.audio = new Audio(getResourceUrl(audioUrl));
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
    // 使用逻辑尺寸清理 Canvas
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, width, height);

    this.danmakus = this.danmakus.filter(danmaku => {
      // 只有在非暂停状态且弹幕未被悬停时才移动弹幕
      if (!this.paused && !danmaku.isPaused) {
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

  // 绘制普通文本弹幕（支持多行）
  drawTextDanmaku(danmaku) {
    this.ctx.font = `italic bold ${danmaku.fontSize}px "Microsoft YaHei", "SimHei", sans-serif`;
    this.ctx.fillStyle = danmaku.color;
    this.ctx.globalAlpha = danmaku.opacity;

    const lineHeight = danmaku.fontSize * this.lineHeight;

    // 绘制每一行
    danmaku.lines.forEach((line, index) => {
      const yPos = danmaku.y + (index * lineHeight);
      // 填充文字
      this.ctx.fillText(line, danmaku.x, yPos);
    });
  }

  // 绘制语音弹幕（只绘制文本，按钮由 DOM 元素处理，支持多行）
  drawVoiceDanmaku(danmaku) {
    const buttonSize = 24;
    const padding = 8;
    const textX = danmaku.x + buttonSize + padding;

    // 绘制文本
    this.ctx.globalAlpha = danmaku.opacity;
    this.ctx.font = `italic bold ${danmaku.fontSize}px "Microsoft YaHei", "SimHei", sans-serif`;
    this.ctx.fillStyle = danmaku.color;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';

    const lineHeight = danmaku.fontSize * this.lineHeight;

    // 绘制每一行
    danmaku.lines.forEach((line, index) => {
      const yPos = danmaku.y + (index * lineHeight);
      this.ctx.fillText(line, textX, yPos);
    });
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

  updateDanmakuLikes(danmakuId, newLikes, isLiked) {
    this.danmakus.forEach(danmaku => {
      if (danmaku.id === danmakuId) {
        danmaku.likes = newLikes;
        if (isLiked !== undefined) {
          danmaku.isLiked = isLiked;
        }
        // 重新计算字号
        const newFontSize = this.fontSize + Math.floor(newLikes / 10);
        danmaku.fontSize = newFontSize;
      }
    });

    // 如果当前悬停的是这个弹幕，刷新面板显示最新的点赞态
    if (this.hoveredDanmaku && this.hoveredDanmaku.id === danmakuId) {
      this.showActionPanel(this.hoveredDanmaku);
    }
  }

}

export default DanmakuEngine;
