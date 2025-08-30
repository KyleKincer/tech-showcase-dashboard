import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { useEffect, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { inferNameFromEmailClient } from "@/lib/utils";
import { AdminTools } from "./AdminTools";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">CRM TECH SHOWCASE</h1>
          <Authenticated>
            <SignOutButton />
          </Authenticated>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Authenticated>
          <AuthenticatedContent />
        </Authenticated>
        <Unauthenticated>
          <UnauthenticatedContent />
        </Unauthenticated>
      </main>
      
      <Toaster position="top-center" />
    </div>
  );
}

function UnauthenticatedContent() {
  return (
    <div className="max-w-md mx-auto text-center space-y-8">
      <div>
        <h2 className="text-4xl font-bold mb-4">WEEKLY TECH SHOWCASE</h2>
        <p className="text-xl text-gray-600">Every Thursday</p>
        <p className="text-lg text-gray-500 mt-4">Sign in to register your presentation</p>
      </div>
      <SignInForm />
    </div>
  );
}

function AuthenticatedContent() {
  const upcomingMeeting = useQuery(api.presentations.getUpcomingMeeting);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const availableWeeks = useQuery(api.presentations.getAvailableWeeks);
  const selectedWeekData = useQuery(
    api.presentations.getPresentationsByDate,
    selectedWeek ? { date: selectedWeek } : "skip"
  );
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const adminStatus = useQuery(api.presentations.checkAdminStatus);

  if (upcomingMeeting === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const currentData = selectedWeekData || upcomingMeeting;
  const isAdmin = adminStatus?.isAdmin || false;
  const selectedWeekInfo = availableWeeks?.find(w => w.date === selectedWeek);
  const isPastWeek = selectedWeekInfo?.isPast || false;
  const isInactiveWeek = currentData.isInactive || false;

  return (
    <div className="space-y-12">
      {/* Next Meeting Section */}
      <section className="text-center space-y-6">
        <div>
          <h2 className="text-5xl font-bold mb-2">
            {selectedWeek ? (isPastWeek ? "PAST MEETING" : "SIGN UP FOR") : "NEXT MEETING"}
          </h2>
          <p className={`text-3xl font-mono ${isInactiveWeek ? "text-gray-500" : ""}`}>
            {currentData.formattedDate}
          </p>
          {isPastWeek && (
            <p className="text-lg text-gray-500 mt-2">This meeting has already occurred</p>
          )}
          {isInactiveWeek && (
            <div className="mt-4 p-4 bg-gray-100 border-2 border-gray-300 rounded">
              <p className="text-lg font-bold text-gray-700">[INACTIVE WEEK]</p>
              {currentData.inactiveReason && (
                <p className="text-sm text-gray-600 mt-1">{currentData.inactiveReason}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">Signups are not allowed for this week</p>
            </div>
          )}
        </div>
        
        {!isPastWeek && !isInactiveWeek && <SignupForm meetingDate={currentData.date} />}
      </section>

      {/* Week Selector */}
      <section className="border-t-2 border-black pt-12">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold">
            {selectedWeek ? "PRESENTATIONS FOR" : "UPCOMING PRESENTATIONS"}
          </h3>
          <button
            onClick={() => setShowWeekSelector(!showWeekSelector)}
            className="px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors font-mono"
          >
            {showWeekSelector ? "HIDE WEEKS" : "VIEW ALL WEEKS"}
          </button>
        </div>

        {showWeekSelector && availableWeeks && (
          <div className="mb-8">
            {/* Current/Future Weeks */}
            <div className="mb-6">
              <h4 className="text-lg font-bold mb-3 text-gray-700">UPCOMING MEETINGS</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    setSelectedWeek(null);
                    setShowWeekSelector(false);
                  }}
                  className={`p-3 border-2 border-black text-sm font-mono transition-colors ${
                    !selectedWeek ? "bg-black text-white" : "hover:bg-gray-100"
                  }`}
                >
                  NEXT MEETING
                </button>
                {availableWeeks.filter(w => !w.isPast).slice(1).map((week) => (
                  <button
                    key={week.date}
                    onClick={() => {
                      setSelectedWeek(week.date);
                      setShowWeekSelector(false);
                    }}
                    className={`p-3 border-2 text-sm font-mono transition-colors relative ${
                      week.isInactive 
                        ? "border-gray-400 text-gray-500 bg-gray-50" 
                        : "border-black"
                    } ${
                      selectedWeek === week.date 
                        ? (week.isInactive ? "bg-gray-400 text-white" : "bg-black text-white")
                        : (week.isInactive ? "" : "hover:bg-gray-100")
                    }`}
                  >
                    {week.formattedDate.split(',')[0]}
                    <br />
                    {week.formattedDate.split(', ')[1]}
                    {week.isInactive && (
                      <div className="absolute top-1 right-1 text-xs font-bold">[X]</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Past Weeks */}
            {availableWeeks.filter(w => w.isPast).length > 0 && (
              <div>
                <h4 className="text-lg font-bold mb-3 text-gray-700">PAST MEETINGS</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableWeeks.filter(w => w.isPast).map((week) => (
                    <button
                      key={week.date}
                      onClick={() => {
                        setSelectedWeek(week.date);
                        setShowWeekSelector(false);
                      }}
                      className={`p-3 border-2 text-sm font-mono transition-colors relative ${
                        week.isInactive 
                          ? "border-gray-300 text-gray-400 bg-gray-50" 
                          : "border-gray-400 text-gray-600"
                      } ${
                        selectedWeek === week.date 
                          ? (week.isInactive ? "bg-gray-400 text-white" : "bg-gray-600 text-white")
                          : (week.isInactive ? "" : "hover:bg-gray-50")
                      }`}
                    >
                      {week.formattedDate.split(',')[0]}
                      <br />
                      {week.formattedDate.split(', ')[1]}
                      {week.isInactive && (
                        <div className="absolute top-1 right-1 text-xs font-bold">[X]</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className={`text-xl font-bold ${isInactiveWeek ? "text-gray-600" : ""}`}>
              {currentData.formattedDate}
              {isPastWeek && (
                <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  PAST MEETING
                </span>
              )}
              {isInactiveWeek && (
                <span className="ml-3 text-sm font-normal text-gray-600 bg-gray-200 px-2 py-1 rounded">
                  [INACTIVE]
                </span>
              )}
            </h4>
            
            {/* Recording Link Display/Management */}
            {currentData.recordingUrl && !isAdmin && (
              <a
                href={currentData.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white font-mono text-sm hover:bg-blue-700 transition-colors"
              >
                [VIEW RECORDING]
              </a>
            )}
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <AdminTools defaultMeetingDate={currentData.date} />
              </div>
              <RecordingManager
                meetingDate={currentData.date}
                currentRecordingUrl={currentData.recordingUrl}
              />
              <InactiveWeekManager
                meetingDate={currentData.date}
                isInactive={isInactiveWeek}
                inactiveReason={currentData.inactiveReason}
              />
            </div>
          )}
          
          {currentData.presentations.length === 0 ? (
            <div className={`text-center py-8 border-2 ${
              isInactiveWeek 
                ? "text-gray-400 border-gray-200 bg-gray-50" 
                : "text-gray-500 border-gray-200"
            }`}>
              <p className="text-lg">
                {isPastWeek 
                  ? "No presentations were scheduled" 
                  : isInactiveWeek 
                    ? "Week is inactive - no presentations allowed"
                    : "No presentations scheduled yet"
                }
              </p>
              {!isPastWeek && !isInactiveWeek && <p>Be the first to sign up!</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {currentData.presentations.map((presentation, index) => (
                <PresentationItem
                  key={`${presentation.meetingDate}-${presentation.signupTime}`}
                  presentation={presentation}
                  index={index}
                  canEdit={
                    !isPastWeek && !isInactiveWeek && (
                      (loggedInUser?.email === presentation.presenterEmail && !loggedInUser?.isAnonymous) ||
                      isAdmin
                    )
                  }
                  isAdmin={isAdmin}
                  isOwner={loggedInUser?.email === presentation.presenterEmail}
                  isPastWeek={isPastWeek}
                  isInactiveWeek={isInactiveWeek}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}



function RecordingManager({ 
  meetingDate, 
  currentRecordingUrl 
}: { 
  meetingDate: string; 
  currentRecordingUrl: string | null; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(currentRecordingUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addRecordingLink = useMutation(api.presentations.addRecordingLink);
  const removeRecordingLink = useMutation(api.presentations.removeRecordingLink);

  const handleSave = async () => {
    if (!recordingUrl.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addRecordingLink({
        meetingDate,
        recordingUrl: recordingUrl.trim(),
      });
      setIsEditing(false);
      toast.success("Recording link saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save recording link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setIsSubmitting(true);
    try {
      await removeRecordingLink({ meetingDate });
      setRecordingUrl("");
      setIsEditing(false);
      toast.success("Recording link removed!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove recording link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setRecordingUrl(currentRecordingUrl || "");
    setIsEditing(false);
  };

  return (
    <div className="border-2 border-black p-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-bold">Recording Link</h5>
        {currentRecordingUrl && !isEditing && (
          <a
            href={currentRecordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 border-2 border-black font-mono text-sm hover:bg-black hover:text-white"
          >
            [VIEW]
          </a>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <input
            type="url"
            value={recordingUrl}
            onChange={(e) => setRecordingUrl(e.target.value)}
            placeholder="Enter recording URL (YouTube, Zoom, etc.)"
            className="w-full p-2 border-2 border-black font-mono text-sm"
            disabled={isSubmitting}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={!recordingUrl.trim() || isSubmitting}
              className="px-3 py-1 bg-black text-white text-sm font-mono hover:bg-gray-800 disabled:bg-gray-300"
            >
              SAVE
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-3 py-1 border-2 border-black text-sm font-mono hover:bg-gray-100"
            >
              CANCEL
            </button>
            {currentRecordingUrl && (
              <button
                onClick={handleRemove}
                disabled={isSubmitting}
                className="px-3 py-1 bg-red-600 text-white text-sm font-mono hover:bg-red-700"
              >
                REMOVE
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            {currentRecordingUrl ? "Recording link is set" : "No recording link set"}
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 border-2 border-black text-sm font-mono hover:bg-black hover:text-white"
          >
            {currentRecordingUrl ? "EDIT" : "ADD LINK"}
          </button>
        </div>
      )}
    </div>
  );
}

function SignupForm({ meetingDate }: { meetingDate: string }) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signUp = useMutation(api.presentations.signUpToPresent);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Check if user is anonymous
    if (loggedInUser?.isAnonymous) {
      toast.error("Anonymous users cannot sign up to present. Please create an account.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({ title: title.trim(), meetingDate });
      setTitle("");
      toast.success("Successfully signed up to present!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign up");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAnonymous = loggedInUser?.isAnonymous;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isAnonymous ? "Create an account to sign up" : "Enter your presentation title"}
          className="w-full p-4 text-lg border-2 border-black focus:outline-none focus:ring-0 font-mono"
          disabled={isSubmitting || isAnonymous}
          maxLength={200}
        />
      </div>
      <button
        type="submit"
        disabled={!title.trim() || isSubmitting || isAnonymous}
        className="w-full p-4 bg-black text-white text-lg font-bold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isAnonymous ? "CREATE ACCOUNT TO SIGN UP" : isSubmitting ? "SIGNING UP..." : "SIGN UP TO PRESENT"}
      </button>
    </form>
  );
}

function PresentationItem({ 
  presentation, 
  index, 
  canEdit,
  isAdmin,
  isOwner,
  isPastWeek,
  isInactiveWeek
}: { 
  presentation: any; 
  index: number; 
  canEdit: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isPastWeek: boolean;
  isInactiveWeek: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(presentation.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editPresentation = useMutation(api.presentations.editPresentation);
  const deletePresentation = useMutation(api.presentations.deletePresentation);

  const handleEdit = async () => {
    if (!editTitle.trim()) return;
    
    try {
      await editPresentation({
        presentationId: presentation._id,
        title: editTitle.trim(),
      });
      setIsEditing(false);
      toast.success("Presentation updated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePresentation({ presentationId: presentation._id });
      setShowDeleteConfirm(false);
      toast.success("Presentation deleted!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(presentation.title);
    setIsEditing(false);
  };

  const itemClasses = `flex items-center justify-between p-4 border-2 ${
    isPastWeek 
      ? "border-gray-300 bg-gray-50" 
      : isInactiveWeek
        ? "border-gray-400 bg-gray-100"
        : "border-black bg-white"
  }`;

  const numberClasses = `text-2xl font-bold font-mono w-8 ${
    isPastWeek ? "text-gray-500" : isInactiveWeek ? "text-gray-600" : ""
  }`;

  const titleClasses = `text-lg font-bold ${
    isPastWeek ? "text-gray-700" : isInactiveWeek ? "text-gray-800" : ""
  }`;

  const subtitleClasses = `text-sm ${
    isPastWeek ? "text-gray-500" : isInactiveWeek ? "text-gray-600" : "text-gray-600"
  }`;

  return (
    <div className={itemClasses}>
      <div className="flex items-center space-x-4 flex-1">
        <div className={numberClasses}>
          {index + 1}.
        </div>
        <div className="flex-1">
          {isEditing ? (
            <div className="flex space-x-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 p-2 border-2 border-black font-mono"
                maxLength={200}
                autoFocus
              />
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-green-600 text-white font-bold hover:bg-green-700"
              >
                SAVE
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border-2 border-black hover:bg-gray-100"
              >
                CANCEL
              </button>
            </div>
          ) : (
            <div>
              <h4 className={titleClasses}>
                {presentation.title}
              </h4>
              <p className={subtitleClasses}>
                by {
                  presentation.presenterName?.includes("@") && presentation.presenterEmail
                    ? inferNameFromEmailClient(presentation.presenterEmail) || presentation.presenterName
                    : presentation.presenterName
                }
                {isAdmin && !isOwner && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-mono rounded">
                    ADMIN VIEW
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {canEdit && !isEditing && (
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 border-2 border-black hover:bg-gray-100 text-sm font-mono"
          >
            EDIT
          </button>
          {showDeleteConfirm ? (
            <div className="flex space-x-1">
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-red-600 text-white text-sm font-bold hover:bg-red-700"
              >
                CONFIRM
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 border-2 border-black hover:bg-gray-100 text-sm font-mono"
              >
                CANCEL
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1 border-2 border-red-600 text-red-600 hover:bg-red-50 text-sm font-mono"
            >
              DELETE
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InactiveWeekManager({
  meetingDate,
  isInactive,
  inactiveReason
}: {
  meetingDate: string;
  isInactive: boolean;
  inactiveReason?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [reason, setReason] = useState(inactiveReason || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const markWeekInactive = useMutation(api.presentations.markWeekInactive);
  const markWeekActive = useMutation(api.presentations.markWeekActive);

  const handleMarkInactive = async () => {
    setIsSubmitting(true);
    try {
      await markWeekInactive({
        meetingDate,
        reason: reason.trim() || undefined,
      });
      setIsEditing(false);
      toast.success("Week marked as inactive!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark week as inactive");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkActive = async () => {
    setIsSubmitting(true);
    try {
      await markWeekActive({ meetingDate });
      setReason("");
      toast.success("Week marked as active!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark week as active");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason(inactiveReason || "");
    setIsEditing(false);
  };

  return (
    <div className="border-2 border-black p-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-bold">Week Status</h5>
        <div
          className={`px-2 py-1 text-xs font-bold border-2 border-black ${
            isInactive ? "bg-gray-200 text-gray-700" : "bg-black text-white"
          }`}
        >
          {isInactive ? "[INACTIVE]" : "[ACTIVE]"}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason for marking week as inactive"
            className="w-full p-2 border-2 border-black font-mono text-sm resize-none"
            rows={2}
            disabled={isSubmitting}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleMarkInactive}
              disabled={isSubmitting}
              className="px-3 py-1 bg-black text-white text-sm font-mono hover:bg-gray-800 disabled:bg-gray-300"
            >
              MARK INACTIVE
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-3 py-1 border-2 border-black text-sm font-mono hover:bg-gray-100"
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">
              {isInactive
                ? `Week is inactive. ${inactiveReason ? `Reason: ${inactiveReason}` : "No reason provided."}`
                : "Week is active and accepting signups"}
            </p>
          </div>
          <div className="flex space-x-2">
            {isInactive ? (
              <button
                onClick={handleMarkActive}
                disabled={isSubmitting}
                className="px-3 py-1 bg-black text-white text-sm font-mono hover:bg-gray-800"
              >
                MARK ACTIVE
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 border-2 border-black text-sm font-mono hover:bg-black hover:text-white"
              >
                MARK INACTIVE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

