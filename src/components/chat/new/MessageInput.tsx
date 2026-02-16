
import React, { useRef, useState, useEffect } from 'react';
import { Send, Smile, Image as ImageIcon, X, Reply as ReplyIcon, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { EmojiPicker } from '../../ui/EmojiPicker';
import type { Message } from '../../../hooks/useChat';

interface MessageInputProps {
    onSendMessage: (content: string, image: File | null) => Promise<void>;
    replyingTo: Message | null;
    editingMessage: Message | null;
    onCancelInteraction: () => void;
    uploading: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSendMessage,
    replyingTo,
    editingMessage,
    onCancelInteraction,
    uploading
}) => {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Populate input when editing
    useEffect(() => {
        if (editingMessage) {
            // eslint-disable-next-line
            setMessage(editingMessage.content);
            inputRef.current?.focus();
        } else if (!replyingTo) {
            setMessage('');
        }
    }, [editingMessage, replyingTo]);

    // Cleanup image preview
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert(t('post.invalid_image'));
            return;
        }

        setSelectedImage(file);
        const url = URL.createObjectURL(file);
        setImagePreview(url);
    };

    const removeImage = () => {
        setSelectedImage(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEmojiSelect = (emoji: string) => {
        const input = inputRef.current;
        if (!input) return;

        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const text = message;
        const before = text.substring(0, start);
        const after = text.substring(end);

        setMessage(before + emoji + after);

        setTimeout(() => {
            input.focus();
            input.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if ((!message.trim() && !selectedImage) || uploading) return;

        await onSendMessage(message.trim(), selectedImage);

        setMessage('');
        removeImage();
        setShowEmojiPicker(false);
    };

    return (
        <div className="p-4 pt-2">
            <div className="max-w-4xl mx-auto relative">

                {/* Interaction Banner (Reply/Edit) */}
                <AnimatePresence>
                    {(replyingTo || editingMessage) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full mb-2 left-0 right-0 bg-surface-container-high/90 backdrop-blur-md rounded-2xl p-3 border border-outline-variant/10 shadow-lg flex items-center justify-between z-10"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    {replyingTo ? <ReplyIcon size={18} /> : <Edit2 size={18} />}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                        {replyingTo ? t('chat.actions.replying_to') : t('chat.actions.editing')}
                                    </span>
                                    <p className="text-sm text-on-surface truncate">
                                        {replyingTo ? replyingTo.content : t('chat.actions.editing_message')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    onCancelInteraction();
                                    setMessage('');
                                }}
                                className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
                                aria-label={t('common.close')}
                            >
                                <X size={18} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Image Preview */}
                <AnimatePresence>
                    {imagePreview && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full mb-4 left-0 w-32 h-32 rounded-3xl overflow-hidden border-2 border-primary/20 shadow-2xl z-20 group/preview"
                        >
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={removeImage}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity text-white"
                                aria-label={t('post.remove_image')}
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Input Bar */}
                <div className="relative flex gap-2 items-center bg-surface/60 backdrop-blur-3xl border border-outline-variant/20 rounded-[32px] p-2 pl-3 shadow-2xl transition-all focus-within:border-primary/40 focus-within:shadow-primary/5">

                    {/* Image Upload Button */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        aria-label={t('post.upload_image')}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={clsx(
                            "p-2 sm:p-3 rounded-2xl transition-all shrink-0 active:scale-90",
                            selectedImage ? "text-primary bg-primary/10" : "text-on-surface-variant/40 hover:text-primary hover:bg-primary/5"
                        )}
                        disabled={!!editingMessage}
                        aria-label={t('post.upload_image')}
                    >
                        <ImageIcon size={20} className="sm:w-6 sm:h-6" />
                    </button>

                    {/* Text Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                        placeholder={replyingTo ? t('chat.type_reply') : t('chat.type_placeholder')}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/30 text-sm lg:text-base outline-none py-2 min-w-0"
                        autoComplete="off"
                    />

                    {/* Emoji Button */}
                    <div className="relative flex items-center shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={clsx(
                                "p-2 sm:p-3 text-on-surface-variant/40 hover:text-primary rounded-2xl transition-all active:scale-90",
                                showEmojiPicker && "text-primary"
                            )}
                            aria-label="Emoji picker"
                        >
                            <Smile size={20} className="sm:w-6 sm:h-6" />
                        </button>
                        <AnimatePresence>
                            {showEmojiPicker && (
                                <EmojiPicker
                                    onSelect={handleEmojiSelect}
                                    onClose={() => setShowEmojiPicker(false)}
                                    className="absolute bottom-full mb-6 right-0"
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Send Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button" // Use type="button" and explicit onClick
                        onClick={() => handleSubmit()}
                        disabled={(!message.trim() && !selectedImage) || uploading}
                        className={clsx(
                            "rounded-2xl w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 p-0 flex items-center justify-center shadow-xl transition-all shrink-0 touch-manipulation z-20",
                            (message.trim() || selectedImage)
                                ? "bg-primary text-on-primary shadow-primary/30"
                                : "bg-surface-container-high text-on-surface-variant/20 cursor-not-allowed shadow-none"
                        )}
                        aria-label={t('chat.send')}
                    >
                        {editingMessage ? (
                            <Edit2 size={18} className="sm:w-[22px] sm:h-[22px]" />
                        ) : (
                            <Send
                                size={18}
                                className={clsx(
                                    "sm:w-[22px] sm:h-[22px] transition-all duration-500",
                                    (message.trim() || selectedImage) && "rotate-[-12deg] translate-x-0.5 -translate-y-0.5"
                                )}
                            />
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};
