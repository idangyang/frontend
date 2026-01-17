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
   * 将中文数字转换为阿拉伯数字
   * @param {string} text - 包含中文数字的文本
   * @returns {string} 转换后的文本
   */
  convertChineseNumbersToDigits(text) {
    // 中文数字映射
    const chineseDigits = {
      '零': 0, '〇': 0,
      '一': 1, '壹': 1,
      '二': 2, '贰': 2, '两': 2,
      '三': 3, '叁': 3,
      '四': 4, '肆': 4,
      '五': 5, '伍': 5,
      '六': 6, '陆': 6,
      '七': 7, '柒': 7,
      '八': 8, '捌': 8,
      '九': 9, '玖': 9
    };

    const chineseUnits = {
      '十': 10, '拾': 10,
      '百': 100, '佰': 100,
      '千': 1000, '仟': 1000,
      '万': 10000, '萬': 10000,
      '亿': 100000000, '億': 100000000
    };

    // 检查是否为连续的单个数字（如"六六六"）
    const isConsecutiveDigits = (str) => {
      // 检查字符串中是否包含单位词
      for (let i = 0; i < str.length; i++) {
        if (chineseUnits.hasOwnProperty(str[i])) {
          return false;
        }
      }
      // 如果全是数字字符，则为连续数字
      return true;
    };

    // 处理连续单个数字（如"六六六" → "666"）
    const parseConsecutiveDigits = (str) => {
      let result = '';
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (chineseDigits.hasOwnProperty(char)) {
          result += chineseDigits[char].toString();
        }
      }
      return result;
    };

    // 处理复杂的中文数字表达式（如"一千二百三十四"）
    const parseComplexNumber = (str) => {
      let result = 0;
      let temp = 0;
      let currentNum = 0;

      for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (chineseDigits.hasOwnProperty(char)) {
          currentNum = chineseDigits[char];
        } else if (chineseUnits.hasOwnProperty(char)) {
          const unit = chineseUnits[char];

          if (unit >= 10000) {
            // 万、亿级别
            temp = (temp + currentNum) * unit;
            result += temp;
            temp = 0;
            currentNum = 0;
          } else {
            // 十、百、千级别
            if (currentNum === 0) currentNum = 1; // 处理"十"、"百"等前面没有数字的情况
            temp += currentNum * unit;
            currentNum = 0;
          }
        }
      }

      result += temp + currentNum;
      return result;
    };

    // 匹配中文数字的正则表达式
    const chineseNumberPattern = /[零〇一壹二贰两三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万萬亿億]+/g;

    return text.replace(chineseNumberPattern, (match) => {
      try {
        // 判断是连续单个数字还是复杂数字表达式
        if (isConsecutiveDigits(match)) {
          // 连续单个数字：六六六 → 666
          return parseConsecutiveDigits(match);
        } else {
          // 复杂数字表达式：六百六十六 → 666
          const number = parseComplexNumber(match);
          return number.toString();
        }
      } catch (error) {
        console.error('转换中文数字失败:', match, error);
        return match; // 转换失败则保留原文
      }
    });
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

      // 将中文数字转换为阿拉伯数字
      const convertedText = this.convertChineseNumbersToDigits(transcribedText);
      console.log('数字转换后:', convertedText);

      return convertedText;
    } catch (error) {
      console.error('语音识别失败:', error);
      console.error('错误详情:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new ASRService();
