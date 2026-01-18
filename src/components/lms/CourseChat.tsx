import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Loader2,
  Bell,
  AtSign,
  MessageCircle,
  X,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  message: string;
  mentions: string[];
  created_at: string;
  user_id: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

interface EnrolledUser {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface MentionNotification {
  id: string;
  message_id: string;
  is_read: boolean;
  created_at: string;
  message?: ChatMessage;
}

interface CourseChatProps {
  courseId: string;
}

export default function CourseChat({ courseId }: CourseChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 });
  const [unreadMentions, setUnreadMentions] = useState<MentionNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchData();
    const subscription = subscribeToMessages();
    return () => {
      subscription?.unsubscribe();
    };
  }, [courseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchData = async () => {
    await Promise.all([fetchMessages(), fetchEnrolledUsers(), fetchUnreadMentions()]);
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data: messagesData, error } = await supabase
      .from('course_chat_messages')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Fetch user profiles for messages
    const userIds = [...new Set(messagesData?.map((m) => m.user_id) || [])];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('lms_profiles')
        .select('user_id, full_name, avatar_url, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
      const messagesWithUsers = messagesData?.map((m) => ({
        ...m,
        user: profileMap.get(m.user_id),
      }));
      setMessages(messagesWithUsers || []);
    } else {
      setMessages([]);
    }
  };

  const fetchEnrolledUsers = async () => {
    const { data: enrollments, error } = await supabase
      .from('lms_enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('status', 'active');

    if (error || !enrollments) return;

    const userIds = enrollments.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from('lms_profiles')
      .select('user_id, full_name, avatar_url, email')
      .in('user_id', userIds);

    setEnrolledUsers(profiles || []);
  };

  const fetchUnreadMentions = async () => {
    if (!user) return;
    
    const { data: mentions, error } = await supabase
      .from('chat_mentions')
      .select('*, message:course_chat_messages(*)')
      .eq('mentioned_user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mentions:', error);
      return;
    }

    // Fetch user profiles for mention messages
    const userIds = [...new Set(mentions?.map((m) => m.message?.user_id).filter(Boolean) || [])];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('lms_profiles')
        .select('user_id, full_name, avatar_url, email')
        .in('user_id', userIds as string[]);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
      const mentionsWithUsers = mentions?.map((m) => ({
        ...m,
        message: m.message ? { ...m.message, user: profileMap.get(m.message.user_id) } : undefined,
      }));
      setUnreadMentions(mentionsWithUsers || []);
    } else {
      setUnreadMentions(mentions || []);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`course-chat-${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_chat_messages',
          filter: `course_id=eq.${courseId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Fetch user profile for the new message
          const { data: profile } = await supabase
            .from('lms_profiles')
            .select('user_id, full_name, avatar_url, email')
            .eq('user_id', newMsg.user_id)
            .single();

          setMessages((prev) => [...prev, { ...newMsg, user: profile || undefined }]);
          
          // Check if current user was mentioned
          if (user && newMsg.mentions?.includes(user.id) && newMsg.user_id !== user.id) {
            toast({
              title: 'You were mentioned!',
              description: `${profile?.full_name || 'Someone'} mentioned you in the chat.`,
            });
            fetchUnreadMentions();
          }
        }
      )
      .subscribe();

    return subscription;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setNewMessage(value);

    // Check if user is typing a mention
    const textBeforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1].toLowerCase());
      setMentionPosition({
        start: cursorPosition - mentionMatch[0].length,
        end: cursorPosition,
      });
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const getFilteredUsers = () => {
    return enrolledUsers.filter((u) => {
      if (u.user_id === user?.id) return false;
      const name = u.full_name?.toLowerCase() || '';
      const email = u.email.toLowerCase();
      return name.includes(mentionQuery) || email.includes(mentionQuery);
    });
  };

  const insertMention = (mentionedUser: EnrolledUser) => {
    const displayName = mentionedUser.full_name || mentionedUser.email.split('@')[0];
    const before = newMessage.slice(0, mentionPosition.start);
    const after = newMessage.slice(mentionPosition.end);
    const newValue = `${before}@${displayName} ${after}`;
    setNewMessage(newValue);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const extractMentions = (message: string): string[] => {
    const mentionedUserIds: string[] = [];
    
    enrolledUsers.forEach((u) => {
      const displayName = u.full_name || u.email.split('@')[0];
      if (message.toLowerCase().includes(`@${displayName.toLowerCase()}`)) {
        mentionedUserIds.push(u.user_id);
      }
    });

    return mentionedUserIds;
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    setSending(true);
    try {
      const mentionedUserIds = extractMentions(newMessage);

      const { data: messageData, error } = await supabase
        .from('course_chat_messages')
        .insert({
          course_id: courseId,
          user_id: user.id,
          message: newMessage.trim(),
          mentions: mentionedUserIds,
        })
        .select()
        .single();

      if (error) throw error;

      // Create mention notifications
      if (mentionedUserIds.length > 0) {
        const mentionInserts = mentionedUserIds.map((userId) => ({
          message_id: messageData.id,
          mentioned_user_id: userId,
        }));

        await supabase.from('chat_mentions').insert(mentionInserts);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const markMentionAsRead = async (mentionId: string) => {
    await supabase
      .from('chat_mentions')
      .update({ is_read: true })
      .eq('id', mentionId);

    setUnreadMentions((prev) => prev.filter((m) => m.id !== mentionId));
  };

  const markAllMentionsAsRead = async () => {
    if (!user) return;

    await supabase
      .from('chat_mentions')
      .update({ is_read: true })
      .eq('mentioned_user_id', user.id)
      .eq('is_read', false);

    setUnreadMentions([]);
    setShowNotifications(false);
  };

  const renderMessageWithMentions = (message: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    let match;

    while ((match = mentionRegex.exec(message)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(message.slice(lastIndex, match.index));
      }

      // Add the mention as a highlighted span
      const mentionedName = match[1];
      const isMentioningCurrentUser = enrolledUsers.some((u) => {
        const displayName = u.full_name || u.email.split('@')[0];
        return displayName.toLowerCase() === mentionedName.toLowerCase() && u.user_id === user?.id;
      });

      parts.push(
        <span
          key={match.index}
          className={`rounded px-1 font-medium ${
            isMentioningCurrentUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/20 text-primary'
          }`}
        >
          @{mentionedName}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.length) {
      parts.push(message.slice(lastIndex));
    }

    return parts.length > 0 ? parts : message;
  };

  const getUserInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b pb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <CardTitle className="text-lg">Course Chat</CardTitle>
          <Badge variant="secondary">{enrolledUsers.length} members</Badge>
        </div>
        
        {/* Notifications Bell */}
        <Popover open={showNotifications} onOpenChange={setShowNotifications}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadMentions.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {unreadMentions.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between border-b p-3">
              <h4 className="font-semibold">Mentions</h4>
              {unreadMentions.length > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllMentionsAsRead}>
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-64">
              {unreadMentions.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No new mentions
                </p>
              ) : (
                <div className="divide-y">
                  {unreadMentions.map((mention) => (
                    <div
                      key={mention.id}
                      className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted"
                      onClick={() => markMentionAsRead(mention.id)}
                    >
                      <AtSign className="mt-0.5 h-4 w-4 text-primary" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {mention.message?.user?.full_name || 'Someone'} mentioned you
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {mention.message?.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(mention.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </CardHeader>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.user_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={msg.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(msg.user?.full_name, msg.user?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="mb-1 text-xs font-semibold">
                        {msg.user?.full_name || msg.user?.email?.split('@')[0] || 'Unknown'}
                      </p>
                    )}
                    <p className="break-words text-sm">
                      {isOwnMessage ? msg.message : renderMessageWithMentions(msg.message)}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Mention Suggestions */}
      {showMentions && getFilteredUsers().length > 0 && (
        <div className="border-t bg-muted/50 p-2">
          <p className="mb-2 text-xs text-muted-foreground">Mention someone:</p>
          <div className="flex flex-wrap gap-1">
            {getFilteredUsers().slice(0, 5).map((u) => (
              <Button
                key={u.user_id}
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                onClick={() => insertMention(u)}
              >
                <AtSign className="mr-1 h-3 w-3" />
                {u.full_name || u.email.split('@')[0]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message... Use @ to mention someone"
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}
