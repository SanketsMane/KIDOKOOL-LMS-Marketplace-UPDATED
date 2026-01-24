import { requireTeacher } from "@/app/data/auth/require-roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSessionForm } from "../_components/CreateSessionForm";
import { ArrowLeft, Video, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CreateSessionPage() {
  await requireTeacher();

  return (

    <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <CreateSessionForm />
    </div>
  );
}

