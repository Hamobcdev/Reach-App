import React, { useState } from 'react';
import { PlayCircle, PauseCircle, Volume2, VolumeX } from 'lucide-react';

interface VideoTutorialProps {
  title: string;
  description: string;
  placeholderSrc?: string;
}

const VideoTutorial: React.FC<VideoTutorialProps> = ({ 
  title, 
  description, 
  placeholderSrc = 'https://images.pexels.com/photos/8867433/pexels-photo-8867433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative aspect-video bg-gray-100">
        {/* Placeholder image */}
        <img 
          src={placeholderSrc} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        
        {/* Play/Pause overlay */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <button 
            onClick={togglePlay}
            className="text-white transition-transform hover:scale-110"
          >
            {isPlaying ? (
              <PauseCircle size={64} />
            ) : (
              <PlayCircle size={64} />
            )}
          </button>
        </div>
        
        {/* Video controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="text-white text-sm font-medium">{isPlaying ? 'Playing...' : 'Click to play'}</div>
            <button 
              onClick={toggleMute}
              className="text-white"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          
          {/* Progress bar (static for placeholder) */}
          <div className="w-full h-1 bg-gray-600 rounded-full mt-2">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: isPlaying ? '35%' : '0%' }}></div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
};

export default VideoTutorial;