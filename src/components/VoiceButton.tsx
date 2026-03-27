'use client';

import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceResult {
  action: string;
  products: Array<{
    name: string;
    quantity: number;
    matchedProduct?: {
      id: string;
      name: string;
      price: number;
    };
    confidence: number;
  }>;
  clientName?: string;
  rawText: string;
  confidence: number;
}

interface VoiceButtonProps {
  onResult: (result: VoiceResult) => void;
  mode?: 'sale' | 'stock';
}

export default function VoiceButton({ onResult, mode = 'sale' }: VoiceButtonProps) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
      };

      mediaRecorder.start();
      setRecording(true);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 10000);
    } catch {
      alert('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Voice processing failed');
      }

      const data = await res.json();
      onResult(data.parsed);

      // Optional voice feedback
      if ('speechSynthesis' in window && data.parsed.products.length > 0) {
        const msg = new SpeechSynthesisUtterance(
          `J'ai compris ${data.parsed.products.map((p: VoiceResult['products'][0]) => `${p.quantity} ${p.name}`).join(' et ')}${data.parsed.clientName ? ` pour ${data.parsed.clientName}` : ''}`
        );
        msg.lang = 'fr-FR';
        window.speechSynthesis.speak(msg);
      }
    } catch {
      alert('Erreur de traitement vocal. Veuillez réessayer.');
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <button
        disabled
        className="flex items-center gap-2 bg-[#8b5cf6] text-white px-4 py-3 rounded-full opacity-75"
      >
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">{t('common.loading')}</span>
      </button>
    );
  }

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      className={`
        flex items-center gap-2 px-4 py-3 rounded-full text-white font-medium transition-all
        ${recording
          ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200'
          : 'bg-[#8b5cf6] hover:bg-purple-600 shadow-lg shadow-purple-200'
        }
      `}
      title={t('sale.voiceInput')}
    >
      {recording ? <MicOff size={20} /> : <Mic size={20} />}
      <span className="text-sm">
        {recording ? t('sale.listening') : t('sale.voiceInput')}
      </span>
    </button>
  );
}
