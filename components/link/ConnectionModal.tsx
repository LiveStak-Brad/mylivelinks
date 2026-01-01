'use client';

interface ConnectionModalProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  tags?: string[];
  type: 'mutual' | 'match';
  onKeepGoing: () => void;
  profileUrl?: string;
}

export function ConnectionModal({
  open,
  onClose,
  displayName,
  username,
  avatarUrl,
  tags = [],
  type,
  onKeepGoing,
  profileUrl,
}: ConnectionModalProps) {
  if (!open) return null;

  const isMutual = type === 'mutual';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-2">
            {isMutual ? "You're Mutuals! 🤝" : "It's a Match! 💕"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You and {displayName} {isMutual ? 'linked' : 'matched'}!
          </p>
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="flex items-center gap-3 justify-center">
            <img src={avatarUrl || '/placeholder-avatar.png'} alt={displayName} className="w-12 h-12 rounded-full" />
            <div className="text-left">
              <p className="font-bold">{displayName}</p>
              {username && <p className="text-sm text-gray-500">@{username}</p>}
            </div>
          </div>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {profileUrl && (
            <button
              onClick={() => {
                console.log('Navigate to profile:', profileUrl);
                onClose();
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              View Profile
            </button>
          )}
          
          <button
            onClick={() => {
              console.log('Navigate to messages with:', username);
              onClose();
            }}
            className="w-full py-4 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </span>
          </button>

          <button
            onClick={onKeepGoing}
            className="w-full py-4 px-6 border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-semibold text-lg transition-colors"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}
