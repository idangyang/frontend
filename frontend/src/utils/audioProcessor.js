/**
 * 音频处理工具
 * 用于处理语音弹幕的音频文件
 */

class AudioProcessor {
  /**
   * 将 Blob 转换为 File 对象
   * @param {Blob} blob - 音频 Blob
   * @param {string} filename - 文件名
   * @returns {File} File 对象
   */
  static blobToFile(blob, filename) {
    return new File([blob], filename, {
      type: blob.type,
      lastModified: Date.now()
    });
  }

  /**
   * 获取音频时长
   * @param {Blob} audioBlob - 音频 Blob
   * @returns {Promise<number>} 音频时长（秒）
   */
  static getAudioDuration(audioBlob) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      });

      audio.addEventListener('error', (error) => {
        URL.revokeObjectURL(audio.src);
        reject(error);
      });
    });
  }

  /**
   * 压缩音频（降低采样率和比特率）
   * @param {Blob} audioBlob - 原始音频 Blob
   * @returns {Promise<Blob>} 压缩后的音频 Blob
   */
  static async compressAudio(audioBlob) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 降低采样率到 16kHz
      const targetSampleRate = 16000;
      const offlineContext = new OfflineAudioContext(
        1, // 单声道
        audioBuffer.duration * targetSampleRate,
        targetSampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();

      const renderedBuffer = await offlineContext.startRendering();

      // 转换为 WAV 格式
      const wavBlob = this.audioBufferToWav(renderedBuffer);

      return wavBlob;
    } catch (error) {
      console.error('音频压缩失败:', error);
      // 如果压缩失败，返回原始音频
      return audioBlob;
    }
  }

  /**
   * 将 AudioBuffer 转换为 WAV 格式
   * @param {AudioBuffer} buffer - AudioBuffer 对象
   * @returns {Blob} WAV 格式的 Blob
   */
  static audioBufferToWav(buffer) {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // 写入 WAV 文件头
    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF 标识符
    setUint32(0x46464952);
    // 文件长度
    setUint32(length - 8);
    // WAVE 标识符
    setUint32(0x45564157);
    // fmt 子块
    setUint32(0x20746d66);
    // 子块大小
    setUint32(16);
    // 音频格式 (PCM)
    setUint16(1);
    // 声道数
    setUint16(buffer.numberOfChannels);
    // 采样率
    setUint32(buffer.sampleRate);
    // 字节率
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
    // 块对齐
    setUint16(buffer.numberOfChannels * 2);
    // 位深度
    setUint16(16);
    // data 子块
    setUint32(0x61746164);
    // 数据长度
    setUint32(length - pos - 4);

    // 写入音频数据
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}

export default AudioProcessor;
