import * as React from "react";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Building2, Save, Pencil, Lock } from "lucide-react";

export default function Settings() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [pendingEditField, setPendingEditField] = useState<string | null>(null);

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, message: '', error: false });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ loading: true, message: '', error: false });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ loading: false, message: 'New passwords do not match', error: true });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordStatus({ loading: false, message: 'Password changed successfully', error: false });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordStatus({ loading: false, message: data.error || 'Failed to change password', error: true });
      }
    } catch (err: any) {
      setPasswordStatus({ loading: false, message: err.message, error: true });
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) setProfile(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleEditClick = (fieldName: string) => {
    const isAnyCurrentlyEditing = Object.keys(editingFields).some(k => editingFields[k]);
    if (!isAnyCurrentlyEditing) {
      setPendingEditField(fieldName);
    } else {
      setEditingFields(prev => ({ ...prev, [fieldName]: true }));
    }
  };

  const confirmEdit = () => {
    if (pendingEditField) {
      setEditingFields(prev => ({ ...prev, [pendingEditField]: true }));
      setPendingEditField(null);
    }
  };

  const declineEdit = () => {
    setPendingEditField(null);
  };

  const handleCancel = () => {
    setEditingFields({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, signature: reader.result as string });
        setEditingFields(prev => ({ ...prev, signature: true }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      alert('Profile saved successfully!');
      setEditingFields({});
    } catch (e) {
      console.error(e);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const isAnyEditing = Object.keys(editingFields).some(k => editingFields[k]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex justify-center items-center">
        <div className="flex flex-col items-center text-slate-500">
           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 relative">
      {pendingEditField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Edit Settings?</h3>
            <p className="text-slate-600 text-sm mb-6">
              Are you sure you want to edit your profile details? 
              Remember that changes to your company or banking details will reflect on all new invoices.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={declineEdit}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmEdit}>
                Yes, enable editing
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-2">Manage your company profile and banking details used on invoices.</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 rounded-t-xl">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-400" />
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700">Company Name</label>
                  {!editingFields['company_name'] && (
                    <button onClick={() => handleEditClick('company_name')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Company Name">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Input 
                  name="company_name" 
                  value={profile?.company_name || ""} 
                  onChange={handleChange}
                  readOnly={!editingFields['company_name']}
                  disabled={!editingFields['company_name']}
                />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  {!editingFields['email'] && (
                    <button onClick={() => handleEditClick('email')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Email">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Input 
                  name="email" 
                  value={profile?.email || ""} 
                  onChange={handleChange}
                  readOnly={!editingFields['email']}
                  disabled={!editingFields['email']}
                />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700">Phone</label>
                  {!editingFields['phone'] && (
                    <button onClick={() => handleEditClick('phone')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Phone">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Input 
                  name="phone" 
                  value={profile?.phone || ""} 
                  onChange={handleChange}
                  readOnly={!editingFields['phone']}
                  disabled={!editingFields['phone']}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700">Address</label>
                  {!editingFields['address'] && (
                    <button onClick={() => handleEditClick('address')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Address">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <textarea 
                  name="address" 
                  value={profile?.address || ""} 
                  onChange={handleChange}
                  disabled={!editingFields['address']}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700">Signature Image</label>
                  {!editingFields['signature'] && (
                    <button onClick={() => handleEditClick('signature')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Signature">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {profile?.signature && (
                  <div className="mb-2">
                    <img src={profile.signature} alt="Signature" className="max-h-24 max-w-sm object-contain border border-slate-200 rounded p-1 bg-white" />
                  </div>
                )}
                {editingFields['signature'] && (
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Banking Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Bank Name</label>
                    {!editingFields['bank_name'] && (
                      <button onClick={() => handleEditClick('bank_name')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Bank Name">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Input 
                    name="bank_name" 
                    value={profile?.bank_name || ""} 
                    onChange={handleChange}
                    readOnly={!editingFields['bank_name']}
                    disabled={!editingFields['bank_name']}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Account Name</label>
                    {!editingFields['bank_account_name'] && (
                      <button onClick={() => handleEditClick('bank_account_name')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Account Name">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Input 
                    name="bank_account_name" 
                    value={profile?.bank_account_name || ""} 
                    onChange={handleChange}
                    readOnly={!editingFields['bank_account_name']}
                    disabled={!editingFields['bank_account_name']}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Account Number</label>
                    {!editingFields['bank_account_no'] && (
                      <button onClick={() => handleEditClick('bank_account_no')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Account Number">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Input 
                    name="bank_account_no" 
                    value={profile?.bank_account_no || ""} 
                    onChange={handleChange}
                    readOnly={!editingFields['bank_account_no']}
                    disabled={!editingFields['bank_account_no']}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">GST Percentage (%)</label>
                    {!editingFields['gst_percentage'] && (
                      <button onClick={() => handleEditClick('gst_percentage')} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit GST Percentage">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Input 
                    name="gst_percentage" 
                    type="number"
                    step="0.01"
                    value={profile?.gst_percentage || ""} 
                    onChange={handleChange}
                    readOnly={!editingFields['gst_percentage']}
                    disabled={!editingFields['gst_percentage']}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3">
              {isAnyEditing && (
                <>
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 mt-8">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 rounded-t-xl">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-400" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Current Password</label>
                <Input 
                  type="password" 
                  value={passwordData.currentPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">New Password</label>
                <Input 
                  type="password" 
                  value={passwordData.newPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
                <Input 
                  type="password" 
                  value={passwordData.confirmPassword} 
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                  required 
                />
              </div>

              {passwordStatus.message && (
                <div className={`p-3 text-sm rounded ${passwordStatus.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {passwordStatus.message}
                </div>
              )}

              <Button type="submit" disabled={passwordStatus.loading} className="bg-slate-900 text-white hover:bg-slate-800">
                {passwordStatus.loading ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
