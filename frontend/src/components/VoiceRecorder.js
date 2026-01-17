import React, { useState, useRef, useEffect } from 'react';
import './VoiceRecorder.css';
import api from '../services/api';

const VoiceRecorder = ({ onRecordComplete, maxDuration = 10 }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // 检查浏览器是否支持 getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('您的浏览器不支持录音功能。请使用最新版本的 Chrome、Firefox 或 Safari，并确保使用 HTTPS 访问。');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

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

        // 录音结束后自动调用后端语音识别
        transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscribedText('');

      // 启动计时器（不限制时长）
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('无法访问麦克风:', error);

      let errorMessage = '无法访问麦克风。';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += '请允许浏览器访问麦克风权限。';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += '未检测到麦克风设备。';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += '麦克风被其他应用占用。';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += '麦克风不支持所需的音频设置。';
      } else if (error.name === 'SecurityError') {
        errorMessage += '请使用 HTTPS 或 localhost 访问此页面。';
      } else {
        errorMessage += '请检查浏览器权限设置和网络连接。';
      }

      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // 调用后端 API 进行语音识别
  const transcribeAudio = async (audioBlob) => {
    try {
      setIsTranscribing(true);
      console.log('开始语音识别...');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await api.post('/danmaku/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.text) {
        setTranscribedText(response.data.text);
        console.log('语音识别成功:', response.data.text);
      }
    } catch (error) {
      console.error('语音识别失败:', error);
      // 识别失败不影响录音功能，用户可以选择直接发送
    } finally {
      setIsTranscribing(false);
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
              {recordingTime}s
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
                <>
                  <button className="confirm-btn" onClick={handleConfirm}>
                    ✓ 确认发送
                  </button>
                  <button className="option-btn manual-input" onClick={resetRecorder}>
                    重新录制
                  </button>
                  <button className="option-btn clear-btn" onClick={resetRecorder}>
                    清除
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
