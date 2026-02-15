import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Smile, Squirrel, Utensils, Trophy, Lamp, LayoutGrid, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface EmojiCategory {
    id: string;
    icon: React.ReactNode;
    emojis: string[];
}

const EMOJI_DATA: EmojiCategory[] = [
    {
        id: 'smileys',
        icon: <Smile size={18} />,
        emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖']
    },
    {
        id: 'animals',
        icon: <Squirrel size={18} />,
        emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷', '🕸', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', ' beaver', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔']
    },
    {
        id: 'food',
        icon: <Utensils size={18} />,
        emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕️', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊']
    },
    {
        id: 'activities',
        icon: <Trophy size={18} />,
        emojis: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳️', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🧊', '🛹', '🛼', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🤼‍♀️', '🤼', '🤸‍♀️', '🤸', '⛹️‍♀️', '⛹️', '🤺', '🤾‍♀️', '🤾', '🏌️‍♀️', '🏌️', '🏇', '🧘‍♀️', '🧘', '🏄‍♀️', '🏄', '🏊‍♀️', '🏊', '🤽‍♀️', '🤽', '🚣‍♀️', '🚣', '🧗‍♀️', '🧗', '🚵‍♀️', '🚵', '🚴‍♀️', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩']
    },
    {
        id: 'objects',
        icon: <Lamp size={18} />,
        emojis: ['⌚️', '📱', '📲', '💻', '键盘', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', ' DVD', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱', '⏲', '⏰', '🕰', '⌛️', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🪔', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒', '🛠', '⛏', '🪚', '🔩', '⚙️', '🪝', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛀', '🛁', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎', '🔑', '🗝', '🚪', '🪑', '🛋', '🛏', '🛌', '🧸', '🪆', '🖼', '🪞', ' window', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '🪧', '📪', '📫', '📬', '📭', '📮', '🗳', '📜', '📃', '📄', '📅', '📆', '🗓', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇', '📏', '📐', '✂️', '🗃', '🗄', '🗑', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝']
    },
    {
        id: 'symbols',
        icon: <LayoutGrid size={18} />,
        emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '🔟', '🔢', '⏏️', '▶️', '⏸', '⏯', '⏹', '⏺', '⏭', '⏮', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾', '💲', '💱', '™️', '©️', '®️', '👁‍🗨', '🔚', '🔙', '🔛', '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '⚪️', '⚫️', '🔴', '🔵', '🟤', '🟣', '🟢', '🟡', '🟠', '🟥', '🟦', '🟫', '🟪', '🟩', '🟨', '🟧', '⬛️', '⬜️', '◼️', '◻️', '◾️', '◽️', '▪️', '▫️', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '🔳', '🔲']
    }
];

const EMOJI_KEYWORDS: Record<string, string[]> = {
    // Smileys
    '😀': ['smile', 'happy', 'grin', 'laugh'], '😃': ['smile', 'happy', 'grin'], '😄': ['smile', 'happy', 'grin'],
    '😁': ['smile', 'happy', 'grin', 'teeth'], '😅': ['smile', 'happy', 'sweat', 'laugh'], '😂': ['laugh', 'joy', 'tears'],
    '🤣': ['laugh', 'rofl', 'floor'], '😊': ['smile', 'happy', 'blush'], '😇': ['angel', 'halo', 'innocent'],
    '🙂': ['smile', 'slightly'], '🙃': ['upside', 'down'], '😉': ['wink', 'smile'], '😌': ['relieved', 'peace'],
    '😍': ['love', 'heart', 'eyes'], '🥰': ['love', 'hearts', 'smiling'], '😘': ['kiss', 'love'],
    '😗': ['kiss'], '😙': ['kiss'], '😚': ['kiss'], '😋': ['yum', 'delicious', 'tongue'],
    '😛': ['tongue'], '😜': ['tongue', 'wink'], '🤪': ['zany', 'crazy'], '🤨': ['eyebrow', 'suspicious'],
    '🧐': ['monocle', 'inspect'], '🤓': ['nerd', 'geek'], '😎': ['cool', 'sunglasses'], '🤩': ['star', 'eyes'],
    '🥳': ['party', 'celebrate'], '😏': ['smirk', 'cool'], '😒': ['unamused', 'meh'], '😞': ['disappointed', 'sad'],
    '😔': ['pensive', 'sad'], '😟': ['worried', 'sad'], '😕': ['confused'], '🙁': ['frown'],
    '☹️': ['frown', 'sad'], '😮': ['open', 'mouth', 'wow'], '😯': ['hushed', 'wow'], '😲': ['astonished', 'wow'],
    '😳': ['flushed', 'blush'], '🥺': ['pleading', 'begging'], '😦': ['frown', 'open'], '😧': ['anguished'],
    '😨': ['fear', 'scared'], '😰': ['fear', 'sweat'], '😥': ['sad', 'sweat'], '😢': ['cry', 'sad'],
    '😭': ['cry', 'sad', 'sob'], '😱': ['scream', 'fear'], '😖': ['confounded'], '😣': ['persevere'],
    '😓': ['sweat', 'stary'], '😩': ['weary', 'tired'], '😫': ['tired'], '🥱': ['yawn'],
    '😤': ['triumph', 'angry'], '😡': ['angry', 'mad'], '😠': ['angry'], '🤬': ['swearing', 'angry'],
    '😈': ['devil', 'evil'], '👿': ['devil', 'angry'], '💀': ['skull', 'dead'], '☠️': ['poison', 'dead'],
    '💩': ['poop', 'shit'], '🤡': ['clown'], '👹': ['ogre', 'monster'], '👺': ['goblin'],
    '👻': ['ghost', 'spooky'], '👽': ['alien', 'space'], '👾': ['monster', 'game'], '🤖': ['robot'],
    // Animals
    '🐶': ['dog', 'puppy', 'pet'], '🐱': ['cat', 'kitten', 'pet'], '🐹': ['hamster'], '🐰': ['rabbit', 'bunny'],
    'FOX': ['fox'], '🐻': ['bear'], '🐼': ['panda'], '🐨': ['koala'], '🐯': ['tiger'], '🦁': ['lion'],
    '🐮': ['cow'], '🐷': ['pig'], '🐸': ['frog'], '🐵': ['monkey'], '🐔': ['chicken'], '🐧': ['penguin'],
    '🐦': ['bird'], '🐤': ['chick'], '🦆': ['duck'], '🦅': ['eagle'], '🦉': ['owl'], '🦇': ['bat'],
    '🐺': ['wolf'], '🦄': ['unicorn', 'magic'], '🐝': ['bee', 'insect'], '🐛': ['bug', 'insect'], '🦋': ['butterfly'],
    '🐌': ['snail'], '🐞': ['ladybug'], '🕷': ['spider'], '🐢': ['turtle'], '🐍': ['snake'], '🦖': ['t-rex'],
    // Food
    '🍎': ['apple', 'fruit'], '🍌': ['banana', 'fruit'], '🍉': ['watermelon'], '🍓': ['strawberry'], '🫐': ['blueberry'],
    '🍒': ['cherry'], '🍑': ['peach'], '🍍': ['pineapple'], '🥥': ['coconut'], '🥑': ['avocado'], '🥦': ['broccoli'],
    '🌽': ['corn'], '🥕': ['carrot'], '🥐': ['croissant', 'bread'], '🍞': ['bread'], '🧀': ['cheese'],
    '🍳': ['egg', 'breakfast'], '🥞': ['pancakes'], '🥓': ['bacon'], '🍔': ['hamburger', 'burger'], '🍟': ['fries'],
    '🍕': ['pizza'], '🥪': ['sandwich'], '🌮': ['taco'], '🌯': ['burrito'], '🥗': ['salad'], '🍜': ['noodles', 'ramen'],
    '🍝': ['spaghetti', 'pasta'], '🍣': ['sushi'], '🍤': ['shrimp'], '🍦': ['icecream'], '🍰': ['cake'],
    '🧁': ['cupcake'], '🍩': ['donut'], '🍪': ['cookie'], '🍫': ['chocolate'], '🍬': ['candy'], '🍭': ['lollipop'],
    '☕️': ['coffee', 'tea'], '🍺': ['beer'], '🍷': ['wine'], '🍸': ['cocktail'], '🥤': ['drink', 'soda'],
    // Activities
    '⚽️': ['soccer', 'football', 'ball'], '🏀': ['basketball'], '🏈': ['football'], '⚾️': ['baseball'],
    '🎾': ['tennis'], '🏐': ['volleyball'], '🎱': ['8ball', 'pool'], '⛳️': ['golf'], '🥊': ['boxing', 'glove'],
    '🥋': ['karate', 'martial'], '🏆': ['trophy', 'win'], '🥇': ['gold', 'first'], '🎮': ['game', 'controller'],
    '🎲': ['dice', 'game'], '🎨': ['art', 'paint'], '🎤': ['mic', 'sing'], '🎧': ['headphones', 'music'],
    '🎸': ['guitar', 'music'], '🎹': ['piano', 'music'], '🎬': ['movie', 'clap'],
    // Symbols
    '❤️': ['heart', 'love', 'red'], '🧡': ['heart', 'orange'], '💛': ['heart', 'yellow'], '💚': ['heart', 'green'],
    '💙': ['heart', 'blue'], '💜': ['heart', 'purple'], '🖤': ['heart', 'black'], '🤍': ['heart', 'white'],
    '🔥': ['fire', 'lit', 'hot'], '✨': ['sparkles', 'magic'], '⭐': ['star'], '🌟': ['star', 'shining'],
    '💯': ['100', 'perfect'], '💢': ['angry', 'anger'], '💨': ['dash', 'fast'], '💫': ['dizzy', 'sparkle'],
};

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    className?: string;
}

export const EmojiPicker = ({ onSelect, onClose, className }: EmojiPickerProps) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('smileys');
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const displayEmojis = search.trim()
        ? EMOJI_DATA.flatMap(cat => cat.emojis)
            .filter(emoji => {
                const keywords = EMOJI_KEYWORDS[emoji] || [];
                const searchLower = search.toLowerCase().trim();
                return emoji === searchLower || keywords.some(kw => kw.toLowerCase().includes(searchLower));
            })
            .slice(0, 140)
        : EMOJI_DATA.find(cat => cat.id === activeCategory)?.emojis || [];

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className={clsx(
                "w-72 sm:w-80 h-[400px] glass rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-[100]",
                className
            )}
        >
            {/* Header */}
            <div className="p-4 bg-surface/40 border-b border-outline-variant/10">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('chat.type_placeholder') + '...'}
                        className="w-full bg-surface-container rounded-2xl pl-10 pr-10 py-2 text-sm font-medium border-none focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-on-surface-variant/30"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface transition-colors"
                            title={t('common.clear', 'Clear')}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex justify-between items-center px-1">
                    {EMOJI_DATA.map((cat) => (
                        <button
                            key={cat.id}
                            title={t(`emoji.category.${cat.id}`, cat.id)}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                setSearch('');
                            }}
                            className={clsx(
                                "p-2 rounded-xl transition-all",
                                activeCategory === cat.id && !search
                                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                                    : "text-on-surface-variant/60 hover:bg-surface-container"
                            )}
                        >
                            {cat.icon}
                        </button>
                    ))}
                    <button
                        onClick={onClose}
                        title={t('common.close', 'Close')}
                        className="p-2 text-on-surface-variant/40 hover:text-on-surface transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {displayEmojis.length > 0 ? (
                    <div className="grid grid-cols-7 gap-1">
                        {displayEmojis.map((emoji, i) => (
                            <button
                                key={`${search ? 'search' : activeCategory}-${i}`}
                                title={emoji}
                                onClick={() => onSelect(emoji)}
                                className="text-2xl p-2 hover:bg-surface-container rounded-xl transition-transform active:scale-125 hover:scale-110"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center mb-3">
                            <Search className="text-on-surface-variant/20" size={24} />
                        </div>
                        <p className="text-sm font-bold text-on-surface-variant/60">{t('common.no_results') || 'No results'}</p>
                        <p className="text-xs text-on-surface-variant/30 mt-1">{t('common.try_other_keywords') || 'Try other keywords'}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {!search && (
                <div className="px-5 py-3 bg-surface/20 border-t border-outline-variant/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                        {t(`emoji.category.${activeCategory}`, activeCategory)}
                    </p>
                </div>
            )}
        </motion.div>
    );
};
