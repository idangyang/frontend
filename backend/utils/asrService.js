const axios = require('axios');
const fs = require('fs').promises;

/**
 * 阿里云百炼语音识别服务
 */
class ASRService {
  constructor() {
    this.apiKey = process.env.DASHSCOPE_API_KEY;
    this.baseURL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
  }

  /**
   * 将音频文件转换为 Base64 编码
   * @param {string} audioPath - 音频文件路径
   * @returns {Promise<string>} Base64 编码的音频数据
   */
  async audioToBase64(audioPath) {
    try {
      const audioBuffer = await fs.readFile(audioPath);
      return audioBuffer.toString('base64');
    } catch (error) {
      console.error('读取音频文件失败:', error);
      throw error;
    }
  }

  /**
   * 调用阿里云百炼进行语音识别
   * @param {string} audioPath - 音频文件路径
   * @returns {Promise<string>} 识别出的文本
   */
  async transcribe(audioPath) {
    try {
      console.log('开始语音识别，音频文件:', audioPath);

      // 读取音频文件并转换为 Base64
      const audioBuffer = await fs.readFile(audioPath);
      const audioBase64 = audioBuffer.toString('base64');
      const audioUrl = `data:audio/webm;base64,${audioBase64}`;

      // 调用阿里云百炼原生 API
      const response = await axios.post(
        this.baseURL,
        {
          model: 'qwen-audio-turbo',
          input: {
            messages: [
              {
                role: 'system',
                content: [
                  {
                    text: '你是一个专业的语音转文字工具。你的任务是将音频内容逐字转录为文字，只输出说话人说的原话，不要添加任何前缀、后缀、解释、标点符号说明或其他额外内容。'
                  }
                ]
              },
              {
                role: 'user',
                content: [
                  {
                    audio: audioUrl
                  },
                  {
                    text: '转录音频内容'
                  }
                ]
              }
            ]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let transcribedText = response.data.output.choices[0].message.content[0].text.trim();

      // 移除可能的前缀描述
      const prefixes = [
        '这段音频说的是：',
        '这段音频说的是:',
        '音频内容是：',
        '音频内容是:',
        '识别结果：',
        '识别结果:',
        '转录结果：',
        '转录结果:',
        '内容是：',
        '内容是:',
        '音频中是：',
        '音频中是:'
      ];

      for (const prefix of prefixes) {
        if (transcribedText.startsWith(prefix)) {
          transcribedText = transcribedText.substring(prefix.length).trim();
          break;
        }
      }

      // 过滤无效的识别结果
      const invalidResults = [
        '音频中是',
        '无',
        '无内容',
        '没有内容',
        '空',
        ''
      ];

      if (invalidResults.includes(transcribedText) || transcribedText.length === 0) {
        console.log('识别结果无效，返回空字符串');
        return '';
      }

      console.log('语音识别成功:', transcribedText);

      return transcribedText;
    } catch (error) {
      console.error('语音识别失败:', error);
      console.error('错误详情:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new ASRService();
