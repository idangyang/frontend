import React, { useState, useRef, useEffect } from 'react';
import './VoiceRecorder.css';

const VoiceRecorder = ({ onRecordComplete, maxDuration = 10 }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // 初始化 Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-CN';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        console.log('语音识别结果:', transcript);
        setTranscribedText(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        // 不显示弹窗，静默处理
        setIsTranscribing(false);
      };

      recognitionRef.current.onend = () => {
        console.log('语音识别结束');
        setIsTranscribing(false);
      };
    } else {
      console.warn('浏览器不支持 Web Speech API');
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 使用 MediaRecorder 录制音频
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 启动语音识别
      if (recognitionRef.current) {
        setIsTranscribing(true);
        recognitionRef.current.start();
      }

      // 启动计时器
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (recognitionRef.current && isTranscribing) {
        recognitionRef.current.stop();
      }
    }
  };

  const handleConfirm = () => {
    if (!audioBlob) {
      alert('请先录制语音');
      return;
    }

    // 如果有识别文本就用识别文本，否则使用默认文本
    const finalText = transcribedText || '语音弹幕';

    onRecordComplete({
      audioBlob,
      text: finalText.trim(),
      duration: recordingTime
    });
    resetRecorder();
  };

  const handleDirectSend = () => {
    if (!audioBlob) {
      alert('请先录制语音');
      return;
    }

    onRecordComplete({
      audioBlob,
      text: '语音弹幕',
      duration: recordingTime
    });
    resetRecorder();
  };

  const resetRecorder = () => {
    setAudioBlob(null);
    setTranscribedText('');
    setRecordingTime(0);
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-controls">
        {!isRecording && !audioBlob && (
          <button className="record-btn" onClick={startRecording}>
            🎤 开始录音
          </button>
        )}

        {isRecording && (
          <div className="recording-status">
            <button className="stop-btn" onClick={stopRecording}>
              ⏹ 停止录音
            </button>
            <span className="recording-time">
              {recordingTime}s / {maxDuration}s
            </span>
            <span className="recording-indicator">● 录音中...</span>
          </div>
        )}

        {audioBlob && (
          <div className="recorded-audio">
            <audio controls src={URL.createObjectURL(audioBlob)} />
            <div className="transcribed-text">
              <strong>识别文本：</strong>
              {isTranscribing ? '正在识别...' : transcribedText || '未识别到文本'}
            </div>

            {!transcribedText && !isTranscribing && (
              <div className="no-text-options">
                <p className="options-hint">未识别到文本，请选择：</p>
                <div className="option-buttons">
                  <button className="option-btn direct-send" onClick={handleDirectSend}>
                    直接发送（显示"语音弹幕"）
                  </button>
                  <button className="option-btn manual-input" onClick={resetRecorder}>
                    重新录制
                  </button>
                </div>
              </div>
            )}

            <div className="action-buttons">
              {transcribedText && (
                <button className="confirm-btn" onClick={handleConfirm}>
                  ✓ 确认发送
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
