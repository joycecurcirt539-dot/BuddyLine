import { usePresenceContext } from '../context/PresenceContext';

export const usePresence = () => {
    const { onlineUsers } = usePresenceContext();
    return { onlineUsers };
};
