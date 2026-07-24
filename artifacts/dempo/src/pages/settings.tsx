import { useEffect, useState } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { PageContainer, PageHeader } from "@/components/page";
import { UserCircle, Loader2, Download } from "lucide-react";

export default function SettingsPage() {
  const { data: user } = useGetMe();
  const isTeacher = user?.role === "teacher";
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  useEffect(() => {
    if (user?.name != null) setName(user.name);
  }, [user?.name]);

  const saveName = () => {
    updateMe.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Profile updated" });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (e: any) =>
          toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
      },
    );
  };

  return (
    <PageContainer width="narrow" className="animate-in fade-in duration-300">
      <PageHeader
        title="Settings"
        description="Manage your account preferences."
      />

      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information as it appears to others in your courses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 border-2">
                <AvatarImage src={user?.avatarUrl || ''} />
                <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                  {user?.name?.charAt(0) || <UserCircle className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{user?.name}</h3>
                <p className="text-muted-foreground capitalize flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block"></span>
                  {user?.role === "teacher" ? "Professor" : user?.role} Account
                </p>
                <div className="mt-2 text-xs text-muted-foreground border px-2 py-1 rounded inline-block bg-muted/50">
                  Email & avatar are managed by your login
                </div>
              </div>
            </div>

            <div className="grid gap-4 pt-4 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="display-name">Display name</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="sm:max-w-sm" />
                  <Button onClick={saveName} disabled={updateMe.isPending || !name.trim() || name.trim() === (user?.name ?? "")} className="shrink-0">
                    {updateMe.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Email Address</Label>
                <div className="font-medium mt-1">{user?.email}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Account ID</Label>
                <div className="font-mono text-xs mt-1 text-muted-foreground bg-muted p-2 rounded break-all">{user?.id}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isTeacher && <TeacherProfileForm user={user} />}

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Privacy &amp; your data</CardTitle>
            <CardDescription>
              Download a copy of the personal data we hold about you, or review how we handle it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline">
              <a href="/api/me/export" download>
                <Download className="w-4 h-4 mr-2" /> Download my data (JSON)
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">
              See our{" "}
              <a href="/legal/privacy" className="text-info hover:underline">Privacy Policy</a>,{" "}
              <a href="/legal/terms" className="text-info hover:underline">Terms</a> and{" "}
              <a href="/legal/cookies" className="text-info hover:underline">Cookie Notice</a>.
              To delete your account and data, contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function TeacherProfileForm({ user }: { user: any }) {
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setTitle(user.title || "");
      setBio(user.bio || "");
      setLinkedinUrl(user.linkedinUrl || "");
    }
  }, [user?.id]);

  const validateLinkedin = (value: string): string | null => {
    const raw = value.trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (
        (url.protocol === "https:" || url.protocol === "http:") &&
        /(^|\.)linkedin\.com$/i.test(url.hostname)
      ) {
        return null;
      }
    } catch {
      // fall through
    }
    return "Enter a valid LinkedIn URL, e.g. https://www.linkedin.com/in/your-name";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateLinkedin(linkedinUrl);
    setLinkedinError(err);
    if (err) return;

    updateMe.mutate(
      { data: { title: title.trim() || null, bio: bio.trim() || null, linkedinUrl: linkedinUrl.trim() || null } },
      {
        onSuccess: () => {
          toast({ title: "Profile saved", description: "Students will see your updated profile." });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (error: any) => {
          const message = error?.response?.data?.error || "Could not save your profile. Please try again.";
          toast({ title: "Save failed", description: message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Professor Profile</CardTitle>
        <CardDescription>Tell students about yourself. This is shown when they view your profile from a course.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="profile-title">Title / Headline</Label>
            <Input
              id="profile-title"
              placeholder="e.g. Professor of Computer Science"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              rows={5}
              placeholder="Share your background, teaching philosophy, or anything students should know."
              value={bio}
              maxLength={2000}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-linkedin">LinkedIn Profile URL</Label>
            <Input
              id="profile-linkedin"
              placeholder="https://www.linkedin.com/in/your-name"
              value={linkedinUrl}
              onChange={(e) => {
                setLinkedinUrl(e.target.value);
                if (linkedinError) setLinkedinError(null);
              }}
              aria-invalid={!!linkedinError}
              className={linkedinError ? "border-destructive" : undefined}
            />
            {linkedinError && <p className="text-sm text-destructive">{linkedinError}</p>}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button type="submit" disabled={updateMe.isPending} className="mt-4">
              {updateMe.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
