import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Generate a unique meeting room for a live session
export async function createMeetingRoom(sessionId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      teacher: {
        include: { user: true }
      },
      student: true,
    },
  });

  if (!liveSession) {
    throw new Error("Session not found");
  }

  // Check if user is either the teacher or student
  const isTeacher = liveSession.teacher.userId === session.user.id;
  const isStudent = liveSession.studentId === session.user.id;

  if (!isTeacher && !isStudent) {
    throw new Error("Unauthorized to access this session");
  }

  // Generate meeting room ID and details
  const meetingRoomId = `room_${sessionId}_${Date.now()}`;
  const meetingData = {
    roomId: meetingRoomId,
    sessionId: sessionId,
    teacherId: liveSession.teacherId,
    studentId: liveSession.studentId,
    scheduledStart: liveSession.scheduledAt,
    provider: "agora", // Default provider
    status: "scheduled",
  };

  // Update the live session with meeting room details
  await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      // Add meeting room details to the session (you might want to add these fields to your schema)
      // meetingRoomId: meetingRoomId,
      // meetingProvider: "agora",
    },
  });

  return meetingData;
}

// Get meeting room details for a session
export async function getMeetingRoom(sessionId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      teacher: {
        include: { user: true }
      },
      student: true,
    },
  });

  if (!liveSession) {
    throw new Error("Session not found");
  }

  // Check if user is either the teacher or student
  const isTeacher = liveSession.teacher.userId === session.user.id;
  const isStudent = liveSession.studentId === session.user.id;

  if (!isTeacher && !isStudent) {
    throw new Error("Unauthorized to access this session");
  }

  return {
    sessionId: liveSession.id,
    roomId: `room_${sessionId}`,
    isTeacher,
    isStudent,
    teacherName: liveSession.teacher.user.name,
    studentName: liveSession.student?.name || "Student",
    sessionTitle: liveSession.title || "Live Session",
    scheduledTime: liveSession.scheduledAt,
    duration: liveSession.duration,
    status: liveSession.status,
  };
}

// Update session status when meeting starts/ends
export async function updateSessionStatus(sessionId: string, status: "in_progress" | "completed") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { teacher: true },
  });

  if (!liveSession) {
    throw new Error("Session not found");
  }

  // Check if user is either the teacher or student
  const isTeacher = liveSession.teacher.userId === session.user.id;
  const isStudent = liveSession.studentId === session.user.id;

  if (!isTeacher && !isStudent) {
    throw new Error("Unauthorized to access this session");
  }

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      status,
      ...(status === "in_progress" && { actualStartTime: new Date() }),
      ...(status === "completed" && { actualEndTime: new Date() }),
    },
  });

  revalidatePath("/dashboard/sessions");
  return { success: true };
}

// Generate Agora token
export async function generateAgoraToken(channelName: string, userId: string) {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    console.error("Missing Agora credentials: NEXT_PUBLIC_AGORA_APP_ID or AGORA_APP_CERTIFICATE");
    throw new Error("Video service configuration error");
  }

  try {
    // Dynamic import to avoid build issues if package missing/server-only
    const { RtcTokenBuilder, RtcRole } = await import('agora-access-token');

    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Use buildTokenWithUid for numeric UIDs or buildTokenWithAccount for string UIDs
    // Since we pass string userId (e.g. "teacher", "student" or UUID), we use buildTokenWithAccount
    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      channelName,
      userId,
      role,
      privilegeExpiredTs
    );

    return {
      token,
      channelName,
      userId,
      appId,
    };
  } catch (error) {
    console.error("Failed to generate Agora token:", error);
    throw new Error("Failed to initialize video session");
  }
}

// Get available video conferencing providers
export async function getVideoProviders() {
  return [
    {
      id: "agora",
      name: "Agora",
      description: "Real-time video and voice communication",
      available: true,
      features: ["HD Video", "Screen Share", "Recording", "Chat"],
    },
    {
      id: "zoom",
      name: "Zoom",
      description: "Professional video meetings",
      available: false, // Would need Zoom SDK integration
      features: ["HD Video", "Screen Share", "Recording", "Breakout Rooms"],
    },
    {
      id: "webrtc",
      name: "WebRTC",
      description: "Browser-based video calling",
      available: true,
      features: ["Peer-to-peer", "No downloads", "Low latency"],
    },
  ];
}