import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function AdminTools({ defaultMeetingDate }: { defaultMeetingDate: string }) {
  const adminStatus = useQuery(api.presentations.checkAdminStatus);
  const isAdmin = adminStatus?.isAdmin || false;
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 border-2 border-black font-mono text-sm hover:bg-black hover:text-white"
      >
        ADMIN TOOLS
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative space-y-6">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 px-2 py-1 border-2 border-black text-xs font-mono hover:bg-black hover:text-white"
            >
              CLOSE
            </button>
            <BackfillManager defaultMeetingDate={defaultMeetingDate} />
            <AdminManager />
          </div>
        </div>
      )}
    </>
  );
}

function BackfillManager({ defaultMeetingDate }: { defaultMeetingDate: string }) {
  const [meetingDate, setMeetingDate] = useState(defaultMeetingDate);
  useEffect(() => {
    setMeetingDate(defaultMeetingDate);
  }, [defaultMeetingDate]);
  const [presenterEmail, setPresenterEmail] = useState("");
  const [presenterName, setPresenterName] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const adminAddPresentation = useMutation((api as any).presentations.adminAddPresentation);

  const handleAdd = async () => {
    if (!title.trim() || !presenterEmail.trim() || !meetingDate) return;
    setIsSubmitting(true);
    try {
      await adminAddPresentation({
        title: title.trim(),
        meetingDate,
        presenterEmail: presenterEmail.trim(),
        presenterName: presenterName.trim() || undefined,
      });
      toast.success("Presentation backfilled!");
      setTitle("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add presentation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-2 border-black p-4 space-y-4">
      <h5 className="font-bold">Backfill Presentation</h5>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-mono mb-1">Meeting Date</label>
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full p-2 border-2 border-black font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-mono mb-1">Presenter Email</label>
          <input
            type="email"
            value={presenterEmail}
            onChange={(e) => setPresenterEmail(e.target.value)}
            placeholder="user@company.com"
            className="w-full p-2 border-2 border-black font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-mono mb-1">Presenter Name (optional)</label>
          <input
            type="text"
            value={presenterName}
            onChange={(e) => setPresenterName(e.target.value)}
            placeholder="Auto-infers from email if blank"
            className="w-full p-2 border-2 border-black font-mono text-sm"
          />
        </div>
        <div className="md:col-span-4">
          <label className="block text-xs font-mono mb-1">Title</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter presentation title"
              className="flex-1 p-2 border-2 border-black font-mono text-sm"
              maxLength={200}
            />
            <button
              onClick={handleAdd}
              disabled={!title.trim() || !presenterEmail.trim() || !meetingDate || isSubmitting}
              className="px-3 py-2 bg-black text-white text-sm font-mono hover:bg-gray-800 disabled:bg-gray-300"
            >
              ADD
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600">Adds immediately, even for past or inactive weeks.</p>
    </div>
  );
}

function AdminManager() {
  const admins = useQuery(api.presentations.listAdmins);
  const addAdmin = useMutation(api.presentations.addAdmin);
  const removeAdmin = useMutation(api.presentations.removeAdmin);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      await addAdmin({ email: email.trim() });
      toast.success("Admin added");
      setEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    setIsSubmitting(true);
    try {
      await removeAdmin({ email: targetEmail });
      toast.success("Admin removed");
      setConfirmEmail(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-2 border-black p-4 space-y-4">
      <h5 className="font-bold">Manage Admins</h5>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@company.com"
          className="flex-1 p-2 border-2 border-black font-mono text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!email.trim() || isSubmitting}
          className="px-3 py-2 bg-black text-white text-sm font-mono hover:bg-gray-800 disabled:bg-gray-300"
        >
          ADD ADMIN
        </button>
      </div>
      <div className="border-2 border-black">
        <div className="px-3 py-2 bg-gray-100 text-xs font-mono border-b-2 border-black">
          CURRENT ADMINS
        </div>
        <div>
          {admins === undefined ? (
            <div className="p-3 text-sm text-gray-500">Loading...</div>
          ) : admins.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No admins found</div>
          ) : (
            admins.map((a: any) => (
              <div key={a._id} className="p-3 flex items-center justify-between border-b-2 last:border-b-0 border-black">
                <div>
                  <div className="text-sm font-mono">{a.email}</div>
                  <div className="text-xs text-gray-500">
                    added by {a.addedBy} • {new Date(a.addedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {confirmEmail === a.email ? (
                    <>
                      <button
                        onClick={() => handleRemove(a.email)}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-red-600 text-white text-xs font-mono hover:bg-red-700"
                      >
                        CONFIRM
                      </button>
                      <button
                        onClick={() => setConfirmEmail(null)}
                        className="px-3 py-1 border-2 border-black text-xs font-mono hover:bg-gray-100"
                      >
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmEmail(a.email)}
                      className="px-3 py-1 border-2 border-red-600 text-red-600 text-xs font-mono hover:bg-red-50"
                    >
                      REMOVE
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600">You cannot remove yourself; backend prevents it.</p>
    </div>
  );
}
