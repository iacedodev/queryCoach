import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './TypewriterText.scss';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onTextUpdate?: () => void;
  onComplete?: () => void;
}

export function TypewriterText({ text, speed = 60, onTextUpdate, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const lastUpdateTime = useRef(0);
  const scrollThrottle = 100;

  useEffect(() => {
    if (text) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(prev => prev + 1);
        
        const now = Date.now();
        if (now - lastUpdateTime.current >= scrollThrottle) {
          lastUpdateTime.current = now;
          requestAnimationFrame(() => {
            onTextUpdate?.();
          });
        }
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length) {
      setIsTyping(false);
      onComplete?.();
    }
  }, [currentIndex, text, speed, onTextUpdate, onComplete]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    lastUpdateTime.current = 0;
  }, [text]);

  return (
    <div className={`typewriter-text ${!text ? 'empty' : ''} ${isTyping ? 'typing' : ''}`}>
      <ReactMarkdown>{displayedText}</ReactMarkdown>
    </div>
  );
}
