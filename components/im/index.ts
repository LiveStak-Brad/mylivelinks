/**
 * Instant Messaging Components
 * 
 * Usage:
 * 1. Add <IMProvider /> to your layout (handles auth automatically)
 * 2. Use the useIM() hook to open chats from anywhere:
 *    const { openChat } = useIM();
 *    openChat(recipientId, recipientUsername, recipientAvatar);
 */

export { default as IMChatWindow } from './IMChatWindow';
export type { IMMessage, IMChatWindowProps } from './IMChatWindow';

export { default as IMManager, useIM } from './IMManager';
export { default as IMProvider } from './IMProvider';

