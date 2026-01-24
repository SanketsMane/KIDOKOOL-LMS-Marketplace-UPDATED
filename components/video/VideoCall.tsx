"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  MessageSquare,
  Users,
  Settings,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AgoraRTC, {
  AgoraRTCProvider,
  useJoin,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useRTCClient,
  useRemoteUsers,
  RemoteUser,
  LocalUser,
} from "agora-rtc-react";

interface VideoCallProps {
  sessionId: string;
  onCallEnd?: () => void;
}

interface MeetingRoom {
  sessionId: string;
  roomId: string;
  isTeacher: boolean;
  isStudent: boolean;
  teacherName: string;
  studentName: string;
  sessionTitle: string;
  scheduledTime: string;
  duration: number;
  status: string;
}

export default function VideoCall({ sessionId, onCallEnd }: VideoCallProps) {
  const [meetingRoom, setMeetingRoom] = useState<MeetingRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // Initialize Agora Client
  const client = useRTCClient(AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }));

  useEffect(() => {
    loadMeetingRoom();
  }, [sessionId]);

  const loadMeetingRoom = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/video-call?sessionId=${sessionId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load session details");
      }
      
      const room = await response.json();
      setMeetingRoom(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meeting room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCall = async () => {
    if (!meetingRoom) return;

    try {
      setLoading(true); // Show loading state while fetching token
      
      // Update session status to InProgress
      await fetch("/api/video-call", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: "InProgress" })
      });
      
      // Generate token
      const tokenResponse = await fetch("/api/video-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "generateToken", 
          channelName: meetingRoom.roomId, 
          uid: meetingRoom.isTeacher ? "teacher" : "student"
        })
      });

      if (!tokenResponse.ok) {
        const errData = await tokenResponse.json();
        throw new Error(errData.error || "Failed to generate video token");
      }

      const tokenData = await tokenResponse.json();
      
      setToken(tokenData.token);
      setAppId(tokenData.appId);
      setUid(tokenData.userId); // "teacher" or "student"
      setInCall(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join call");
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!meetingRoom) return;

    try {
      // Update session status to Completed
      await fetch("/api/video-call", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: "Completed" })
      });
      
      setInCall(false);
      onCallEnd?.();
    } catch (err) {
      console.error("Error ending call:", err);
      // Still close the local view
      setInCall(false);
      onCallEnd?.();
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto border-none shadow-none bg-transparent">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <Video className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Preparing session...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
        <CardContent className="p-8 text-center">
          <div className="text-red-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p className="font-medium mb-2">Connection Error</p>
            <p className="text-sm mb-4">{error}</p>
            <Button onClick={loadMeetingRoom} variant="outline" className="border-red-200 hover:bg-red-100">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!meetingRoom) return null;

  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col bg-gray-950 rounded-xl overflow-hidden relative">
      {!inCall ? (
        // Pre-call Lobby
        <div className="flex items-center justify-center h-full"> 
          <Card className="w-full max-w-md mx-6 border-gray-800 bg-gray-900/50 backdrop-blur text-white">
            <CardHeader className="text-center pb-2">
              <Avatar className="h-20 w-20 mx-auto mb-4 ring-2 ring-blue-500/50">
                <AvatarFallback className="text-2xl bg-blue-600">
                  {meetingRoom.isTeacher ? meetingRoom.teacherName.charAt(0) : meetingRoom.studentName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">{meetingRoom.sessionTitle}</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                with {meetingRoom.isTeacher ? meetingRoom.studentName : meetingRoom.teacherName}
              </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-2 text-center text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg">
                <p>Duration: {meetingRoom.duration} mins</p>
                <p>Scheduled: {formatDistanceToNow(new Date(meetingRoom.scheduledTime), { addSuffix: true })}</p>
              </div>

              <Button onClick={handleJoinCall} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12">
                <Video className="h-5 w-5 mr-2" />
                Join Session
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Active Call Interface
        <AgoraRTCProvider client={client}>
          <ActiveCall 
            appId={appId!} 
            token={token!} 
            channel={meetingRoom.roomId} 
            uid={uid!}
            onEndCall={handleEndCall}
            isTeacher={meetingRoom.isTeacher}
          />
        </AgoraRTCProvider>
      )}
    </div>
  );
}

// Separate component for the active call logic to use Agora hooks
function ActiveCall({ 
  appId, 
  token, 
  channel, 
  uid, 
  onEndCall,
  isTeacher 
}: { 
  appId: string, 
  token: string, 
  channel: string, 
  uid: string, 
  onEndCall: () => void,
  isTeacher: boolean 
}) {
  // Agora Hooks
  useJoin({ appid: appId, channel: channel, token: token, uid: uid });
  
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  // Local Tracks
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);

  // Publish Tracks
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // Remote Users
  const remoteUsers = useRemoteUsers();

  const toggleMic = () => setMicOn(a => !a);
  const toggleCamera = () => setCameraOn(a => !a);

  return (
    <div className="flex-1 flex flex-col h-full bg-black relative">
       {/* Main Video Area - Grid Layout */}
      <div className={`flex-1 p-4 grid gap-4 ${remoteUsers.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Local User (Self) */}
        <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
          <LocalUser
            audioTrack={localMicrophoneTrack}
            cameraOn={cameraOn}
            micOn={micOn}
            videoTrack={localCameraTrack}
            cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
          >
            <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-white text-xs font-medium">
              You ({isTeacher ? "Teacher" : "Student"})
            </div>
          </LocalUser>
          {!cameraOn && (
             <div className="absolute inset-0 flex items-center justify-center text-gray-500">
               <div className="flex flex-col items-center">
                 <VideoOff className="h-10 w-10 mb-2" />
                 <p className="text-sm">Camera Off</p>
               </div>
             </div>
          )}
        </div>

        {/* Remote Users */}
        {remoteUsers.map((user) => (
          <div key={user.uid} className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
            <RemoteUser user={user}>
               <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-white text-xs font-medium">
                {user.uid === 'teacher' ? 'Teacher' : user.uid === 'student' ? 'Student' : 'Participant'}
              </div>
            </RemoteUser>
          </div>
        ))}
         
         {/* Waiting State if alone */}
         {remoteUsers.length === 0 && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
             <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-xl text-white/80">
               <p className="animate-pulse">Waiting for others to join...</p>
             </div>
           </div>
         )}
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-gray-900/90 backdrop-blur border-t border-gray-800 flex items-center justify-center gap-6 px-4 z-50">
        <Button
          variant={micOn ? "secondary" : "destructive"}
          size="lg"
          className="rounded-full h-12 w-12 p-0"
          onClick={toggleMic}
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={cameraOn ? "secondary" : "destructive"}
          size="lg"
          className="rounded-full h-12 w-12 p-0"
          onClick={toggleCamera}
        >
          {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          className="rounded-full h-12 w-12 p-0 bg-red-600 hover:bg-red-700 text-white"
          onClick={onEndCall}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}