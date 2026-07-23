import { useState } from "react";
import { Link } from "wouter";
import { useGetMe, useListCourses, useCreateCourse, useJoinCourse } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, FileText, Plus, LogIn, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListCoursesQueryKey } from "@workspace/api-client-react";
import { PageContainer, PageHeader } from "@/components/page";

export default function CoursesPage() {
  const { data: user } = useGetMe();
  const { data: courses, isLoading } = useListCourses();
  const isTeacher = user?.role === "teacher";

  return (
    <PageContainer width="wide" className="animate-in fade-in duration-300">
      <PageHeader
        title="Courses"
        description={isTeacher ? "Manage your classes and curriculum." : "Your enrolled classes."}
        actions={isTeacher ? <CreateCourseDialog /> : <JoinCourseDialog />}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-xl border animate-pulse"></div>)}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} isTeacher={isTeacher} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card border border-dashed rounded-xl">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium mb-2">No courses yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {isTeacher 
              ? "Create your first course to start inviting students and posting assignments."
              : "Join a course using an invite code provided by your professor."}
          </p>
          {isTeacher ? <CreateCourseDialog /> : <JoinCourseDialog />}
        </div>
      )}
    </PageContainer>
  );
}

function CourseCard({ course, isTeacher }: { course: any, isTeacher: boolean }) {
  return (
    <Card className="flex flex-col hover:border-primary transition-all hover:shadow-md group">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="px-2 py-1 bg-muted text-xs font-medium rounded text-muted-foreground font-mono">
            {course.inviteCode}
          </div>
        </div>
        <CardTitle className="font-serif text-xl line-clamp-1 group-hover:text-primary transition-colors">
          {course.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 mt-2 min-h-[40px]">
          {course.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="flex gap-4 text-sm text-muted-foreground">
          {isTeacher && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{course.studentCount || 0}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>{course.assignmentCount || 0}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full group-hover:bg-primary" variant="secondary">
          <Link href={`/course/${course.id}`}>
            Enter Course <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

import { BookOpen } from "lucide-react";

function CreateCourseDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createCourse = useCreateCourse();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createCourse.mutate({ data: { title, description } }, {
      onSuccess: () => {
        toast({ title: "Course created successfully" });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        setOpen(false);
        setTitle("");
        setDescription("");
      },
      onError: (err: any) => {
        toast({ title: "Failed to create course", description: err?.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Create Course</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Create a new course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title</Label>
            <Input id="title" placeholder="e.g. Advanced Macroeconomics" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description (Optional)</Label>
            <Input id="desc" placeholder="Brief overview of the curriculum" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!title.trim() || createCourse.isPending}>
              {createCourse.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Course
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinCourseDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const joinCourse = useJoinCourse();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    joinCourse.mutate({ data: { inviteCode: code.toUpperCase().trim() } }, {
      onSuccess: () => {
        toast({ title: "Successfully joined course!" });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        setOpen(false);
        setCode("");
      },
      onError: (err: any) => {
        const status = err?.response?.status ?? err?.status;
        const serverMsg = err?.response?.data?.error;
        const description =
          status === 403
            ? (serverMsg || "You can't join this course with that account.")
            : status === 404
            ? "That invite code doesn't match any course."
            : (serverMsg || "Could not join the course. Please try again.");
        toast({ title: "Couldn't join", description, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><LogIn className="w-4 h-4 mr-2" /> Join Course</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Join a course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="code">Invite Code</Label>
            <Input id="code" placeholder="Enter the 6-character code" value={code} onChange={e => setCode(e.target.value)} className="font-mono text-lg tracking-widest uppercase" autoFocus />
            <p className="text-xs text-muted-foreground">Ask your professor for the course invite code.</p>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!code.trim() || joinCourse.isPending}>
              {joinCourse.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Join Course
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
