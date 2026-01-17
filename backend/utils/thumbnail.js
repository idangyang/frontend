const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

/**
 * 获取视频时长（秒）
 * @param {string} videoPath - 视频文件路径
 * @returns {Promise<number>} - 返回视频时长（秒）
 */
const getVideoDuration = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata.format.duration;
        resolve(duration);
      }
    });
  });
};

/**
 * 获取视频宽高比
 * @param {string} videoPath - 视频文件路径
 * @returns {Promise<number>} - 返回视频宽高比（宽/高）
 */
const getVideoAspectRatio = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (videoStream && videoStream.width && videoStream.height) {
          const aspectRatio = videoStream.width / videoStream.height;
          resolve(aspectRatio);
        } else {
          reject(new Error('无法获取视频尺寸'));
        }
      }
    });
  });
};

/**
 * 获取视频尺寸
 * @param {string} videoPath - 视频文件路径
 * @returns {Promise<{width: number, height: number}>} - 返回视频宽高
 */
const getVideoDimensions = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (videoStream && videoStream.width && videoStream.height) {
          resolve({ width: videoStream.width, height: videoStream.height });
        } else {
          reject(new Error('无法获取视频尺寸'));
        }
      }
    });
  });
};

/**
 * 从视频中提取随机帧作为缩略图
 * @param {string} videoPath - 视频文件路径
 * @param {string} outputPath - 输出缩略图路径
 * @returns {Promise<string>} - 返回缩略图路径
 */
const generateThumbnail = async (videoPath, outputPath) => {
  try {
    // 获取视频时长
    const duration = await getVideoDuration(videoPath);
    console.log(`视频时长: ${duration}秒`);

    // 获取视频实际尺寸
    const dimensions = await getVideoDimensions(videoPath);
    console.log(`视频尺寸: ${dimensions.width}x${dimensions.height}`);

    // 计算封面尺寸，保持原始宽高比
    const maxSize = 640; // 最大边长
    let thumbnailWidth, thumbnailHeight;

    if (dimensions.width > dimensions.height) {
      // 横屏视频：宽度为最大边长
      thumbnailWidth = maxSize;
      thumbnailHeight = Math.round(maxSize * dimensions.height / dimensions.width);
    } else {
      // 竖屏视频：高度为最大边长
      thumbnailHeight = maxSize;
      thumbnailWidth = Math.round(maxSize * dimensions.width / dimensions.height);
    }

    const thumbnailSize = `${thumbnailWidth}x${thumbnailHeight}`;
    console.log(`封面尺寸: ${thumbnailSize}`);

    // 生成随机时间点（避开开头和结尾各10%）
    const startOffset = duration * 0.1;
    const endOffset = duration * 0.9;
    const randomTime = startOffset + Math.random() * (endOffset - startOffset);
    console.log(`随机时间点: ${randomTime}秒`);

    // 格式化时间为 HH:MM:SS
    const hours = Math.floor(randomTime / 3600);
    const minutes = Math.floor((randomTime % 3600) / 60);
    const seconds = Math.floor(randomTime % 60);
    const timestamp = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    console.log(`截取时间戳: ${timestamp}`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: thumbnailSize
        })
        .on('end', () => {
          console.log('封面生成成功:', outputPath);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('封面生成失败:', err);
          reject(err);
        });
    });
  } catch (error) {
    console.error('生成封面时出错:', error);
    throw error;
  }
};

module.exports = { generateThumbnail, getVideoAspectRatio, getVideoDuration };
