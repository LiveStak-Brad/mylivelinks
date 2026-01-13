'use client';

import { useState, useRef } from 'react';
import { X, Upload, Video, Image, Loader2, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Generate thumbnail from video first frame
async function generateVideoThumbnail(videoFile: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadeddata = () => {
      // Seek to 0.5 seconds or start
      video.currentTime = Math.min(0.5, video.duration / 2);
    };
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(video.src);
        resolve(blob);
      }, 'image/jpeg', 0.8);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(null);
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [location, setLocation] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isVlog, setIsVlog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      setError('Please select a video or image file');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setThumbnailBlob(null);
    
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    
    // Generate thumbnail for videos
    if (isVideo) {
      const thumbnail = await generateVideoThumbnail(file);
      if (thumbnail) {
        setThumbnailBlob(thumbnail);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to upload');
        setUploading(false);
        return;
      }

      setUploadProgress(20);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      setUploadProgress(50);

      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName);

      // Upload thumbnail if we have one
      let thumbnailUrl: string | null = null;
      if (thumbnailBlob) {
        const thumbFileName = `${user.id}/${Date.now()}_thumb.jpg`;
        const { error: thumbError } = await supabase.storage
          .from('post-media')
          .upload(thumbFileName, thumbnailBlob, { 
            cacheControl: '3600', 
            upsert: false,
            contentType: 'image/jpeg'
          });
        
        if (!thumbError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbPublicUrl;
        }
      }

      setUploadProgress(70);

      const hashtagArray = hashtags
        .split(/[\s,#]+/)
        .filter(tag => tag.trim())
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      setUploadProgress(85);

      const { error: rpcError } = await supabase.rpc('rpc_create_video_post', {
        p_media_url: publicUrl,
        p_title: title.trim() || null,
        p_caption: caption.trim() || null,
        p_hashtags: hashtagArray.length > 0 ? hashtagArray : null,
        p_location_text: location.trim() || null,
        p_zip_code: zipCode.trim() || null,
        p_thumbnail_url: thumbnailUrl,
        p_is_vlog: isVlog
      });

      if (rpcError) throw new Error(`Failed to create post: ${rpcError.message}`);

      setUploadProgress(100);
      setTimeout(() => { handleClose(); onSuccess(); }, 500);

    } catch (err: any) {
      console.error('Error uploading:', err);
      setError(err.message || 'Failed to upload');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setThumbnailBlob(null);
    setTitle('');
    setCaption('');
    setHashtags('');
    setLocation('');
    setZipCode('');
    setIsVlog(false);
    setUploading(false);
    setUploadProgress(0);
    setError(null);
    onClose();
  };

  const isVideo = selectedFile?.type.startsWith('video/');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Create Post</h2>
          <button onClick={handleClose} disabled={uploading} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* File Upload */}
          <div 
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
              selectedFile ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
            }`}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
            
            {previewUrl ? (
              <div className="space-y-2">
                {isVideo ? (
                  <video src={previewUrl} className="w-full max-h-40 object-contain rounded-lg mx-auto" controls />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full max-h-40 object-contain rounded-lg mx-auto" />
                )}
                <p className="text-xs text-gray-500 truncate">{selectedFile?.name}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-center gap-3">
                  <Video className="w-8 h-8 text-gray-400" />
                  <Image className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Upload video or photo</p>
                <p className="text-xs text-gray-500">Click to browse</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a title..."
              maxLength={100}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              maxLength={2000}
              rows={3}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm resize-none"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hashtags</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#funny #viral #trending"
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Separate with spaces or commas</p>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, venue..."
                maxLength={100}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="12345"
                maxLength={5}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">For nearby discovery</p>
            </div>
          </div>

          {/* Vlog Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium text-sm">Mark as Vlog</p>
              <p className="text-xs text-gray-500">Shows in your Vlogs section</p>
            </div>
            <button
              type="button"
              onClick={() => setIsVlog(!isVlog)}
              disabled={uploading}
              className={`relative w-11 h-6 rounded-full transition ${isVlog ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isVlog ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          {uploading && (
            <div className="mb-3">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">Uploading... {uploadProgress}%</p>
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
