import { supabase } from '../lib/supabase';

export type NotificationType =
    | 'friend_request'
    | 'friend_accept'
    | 'message_received'
    | 'message_forwarded'
    | 'message_reply'
    | 'post_like'
    | 'post_comment'
    | 'comment_reply';

export interface Notification {
    id: string;
    created_at: string;
    recipient_id: string;
    actor_id: string;
    type: NotificationType;
    content?: string;
    target_id?: string;
    target_preview?: string;
    is_read: boolean;
    actor?: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
}

export const notificationService = {
    async getNotifications() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('notifications')
            .select(`
        *,
        actor:actor_id (
          username,
          full_name,
          avatar_url
        )
      `)
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Notification[];
    },

    async markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) throw error;
    },

    async markAllAsRead() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('recipient_id', user.id)
            .eq('is_read', false);

        if (error) throw error;
    },

    async deleteNotification(id: string) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async createNotification(params: {
        recipient_id: string;
        actor_id?: string;
        type: NotificationType;
        content?: string;
        target_id?: string;
        target_preview?: string;
    }) {
        const { error } = await supabase
            .from('notifications')
            .insert([params]);

        if (error) console.error('Error creating notification:', error);
    },

    // Realtime subscription helper
    subscribeToNotifications(callback: (payload: any) => void) {
        return supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    callback(payload);
                }
            )
            .subscribe();
    }
};
