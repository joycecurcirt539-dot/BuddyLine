
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Message, Chat } from '../../hooks/useChat';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { compressImage } from '../../utils/compressImage';
import { supabase } from '../../lib/supabase';
import { MessageContextMenu } from './MessageContextMenu';

// New Components
import { ChatHeader } from './new/ChatHeader';
import { MessageInput } from './new/MessageInput';
import { MessageItem } from './new/MessageItem';

interface ChatWindowProps {
    chat: Chat | null;
    messages: Message[];
    loading: boolean;
    onSendMessage: (content: string, imageUrl?: string, replyToId?: string) => void;
    onDeleteMessage?: (messageId: string) => void;
    onEditMessage?: (messageId: string, newContent: string) => void;
    onForwardMessage?: (message: Message) => void;
    onBack?: () => void;
    isMuted?: boolean;
    onMuteToggle?: () => void;
    onDeleteChat?: () => void;
    onBlockUser?: () => void;
}

export const ChatWindow = ({
    chat,
    messages,
    loading,
    onSendMessage,
    onDeleteMessage,
    onEditMessage,
    onForwardMessage,
    onBack,
    isMuted,
    onMuteToggle,
    onDeleteChat,
    onBlockUser
}: ChatWindowProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();

    // UI State
    const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; position: { x: number; y: number }; message: Message | null }>({ isOpen: false, position: { x: 0, y: 0 }, message: null });
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [uploading, setUploading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll handling
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, replyingTo, editingMessage]);

    // Message Actions
    const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, message: Message) => {
        let x = 0, y = 0;
        if ('touches' in e) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = (e as React.MouseEvent).clientX;
            y = (e as React.MouseEvent).clientY;
        }
        setContextMenu({ isOpen: true, position: { x, y }, message });
    };

    const handleSendMessage = async (content: string, imageFile: File | null) => {
        setUploading(true);
        try {
            if (editingMessage && onEditMessage) {
                await onEditMessage(editingMessage.id, content);
                setEditingMessage(null);
            } else {
                let imageUrl: string | undefined;
                if (imageFile) {
                    // Upload Logic
                    const compressed = await compressImage(imageFile, 150);
                    const extension = compressed.type.split('/')[1] || 'jpg';
                    const fileName = `chat/${chat?.id}/${user?.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

                    const { error } = await supabase.storage
                        .from('post-images')
                        .upload(fileName, compressed, { contentType: compressed.type, upsert: false });

                    if (error) throw error;

                    const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
                    imageUrl = data.publicUrl;
                }

                await onSendMessage(content, imageUrl, replyingTo?.id);
                setReplyingTo(null);
            }
        } catch (error) {
            console.error(error);
            alert(t('common.error'));
        } finally {
            setUploading(false);
        }
    };

    // Menu Actions implementation
    const handleReply = () => {
        if (contextMenu.message) setReplyingTo(contextMenu.message);
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    const handleEdit = () => {
        if (contextMenu.message) {
            setEditingMessage(contextMenu.message);
            setReplyingTo(null);
        }
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    const handleDelete = () => {
        if (contextMenu.message && onDeleteMessage) {
            if (window.confirm(t('chat.confirm_delete'))) {
                onDeleteMessage(contextMenu.message.id);
            }
        }
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    const handleForward = () => {
        if (contextMenu.message && onForwardMessage) {
            onForwardMessage(contextMenu.message);
        }
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    const handleCopy = () => {
        if (contextMenu.message) navigator.clipboard.writeText(contextMenu.message.content);
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    if (!chat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
                <p>{t('chat.select_chat')}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-surface-container-lowest/30" onClick={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}>

            {/* Atmosphere */}
            <div className="absolute inset-0 -z-10 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 w-full h-1/4 bg-gradient-to-b from-primary/10 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-tertiary/5 to-transparent" />
            </div>

            <ChatHeader
                chat={chat}
                onBack={onBack}
                currentUserId={user?.id}
                isMuted={isMuted}
                onMuteToggle={onMuteToggle}
                onDeleteChat={onDeleteChat}
                onBlockUser={onBlockUser}
            />

            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                        <MessageCircle size={48} className="mb-2" />
                        <p>{t('chat.no_messages')}</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageItem
                            key={msg.id}
                            message={msg}
                            isOwn={msg.sender_id === user?.id}
                            onContextMenu={handleContextMenu}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <MessageInput
                onSendMessage={handleSendMessage}
                replyingTo={replyingTo}
                editingMessage={editingMessage}
                onCancelInteraction={() => { setReplyingTo(null); setEditingMessage(null); }}
                uploading={uploading}
            />

            {createPortal(
                <AnimatePresence>
                    {contextMenu.isOpen && contextMenu.message && (
                        <MessageContextMenu
                            message={contextMenu.message}
                            isOwn={contextMenu.message.sender_id === user?.id}
                            onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
                            onReply={handleReply}
                            onForward={handleForward}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onCopy={handleCopy}
                            position={contextMenu.position}
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
