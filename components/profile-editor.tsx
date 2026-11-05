"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props={userId:string;username:string;displayName:string;bio:string;avatarUrl:string|null};
export default function ProfileEditor({userId,username,displayName,bio,avatarUrl}:Props){
 const [name,setName]=useState(displayName);const [handle,setHandle]=useState(username);const [about,setAbout]=useState(bio);const [avatar,setAvatar]=useState(avatarUrl);const [file,setFile]=useState<File|null>(null);const [password,setPassword]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");const supabase=createClient();let avatarPath:string|undefined;
 if(file){if(!file.type.startsWith("image/")||file.size>5*1024*1024){setMessage("Choose an image smaller than 5 MB.");setBusy(false);return;}const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";avatarPath=userId+"/avatar-"+Date.now()+"."+ext;const {error}=await supabase.storage.from("profile-avatars").upload(avatarPath,file,{upsert:true,contentType:file.type});if(error){setMessage("Avatar upload failed: "+error.message);setBusy(false);return;}}
 const update:{username:string;display_name:string;bio:string|null;avatar_path?:string}={username:handle.trim(),display_name:name.trim(),bio:about.trim()||null};if(avatarPath)update.avatar_path=avatarPath;
 const {error}=await supabase.from("profiles").update(update).eq("id",userId);
 if(error){setMessage("Could not update profile: "+(error.code==="23505"?"That username is already taken.":error.message));setBusy(false);return;}
 if(password.trim()){if(password.length<8){setMessage("Password must be at least 8 characters. Your profile was saved.");setBusy(false);return;}const {error:passError}=await supabase.auth.updateUser({password});if(passError){setMessage("Profile saved, but password update failed: "+passError.message);setBusy(false);return;}setPassword("");}
 if(avatarPath){const {data}=await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath,3600);if(data?.signedUrl)setAvatar(data.signedUrl);}
 setFile(null);setMessage("Profile updated successfully.");setBusy(false);
 }
 return <form onSubmit={save} className="mt-7 grid gap-5 rounded-2xl border border-white/10 bg-[#101a2a] p-6">
 <div className="flex items-center gap-4">{avatar?<img src={avatar} alt="Profile avatar" className="h-16 w-16 rounded-full object-cover"/>:<div className="grid h-16 w-16 place-items-center rounded-full bg-blue-500/20 text-xl">{(name||handle||"U").slice(0,1).toUpperCase()}</div>}<label className="text-sm">Profile picture<input type="file" accept="image/png,image/jpeg,image/webp" className="field mt-2" onChange={e=>setFile(e.target.files?.[0]||null)}/><span className="mt-1 block text-xs text-slate-500">PNG, JPG or WebP · up to 5 MB</span></label></div>
 <label className="text-sm">Display name<input className="field mt-2" required maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="text-sm">Username<input className="field mt-2" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" value={handle} onChange={e=>setHandle(e.target.value)}/><span className="mt-1 block text-xs text-slate-500">3–30 letters, numbers or underscores. Must be unique.</span></label>
 <label className="text-sm">Bio<textarea className="field mt-2" rows={3} maxLength={240} value={about} onChange={e=>setAbout(e.target.value)} placeholder="A short introduction (optional)."/></label>
 <div className="border-t border-white/10 pt-5"><h2 className="font-semibold">Change password</h2><label className="mt-3 block text-sm">New password<input className="field mt-2" type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Leave blank to keep your current password"/></label></div>
 {message&&<p role="status" className="text-sm text-cyan-200">{message}</p>}
 <button disabled={busy} className="w-fit rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold disabled:opacity-50">{busy?"Saving...":"Save profile"}</button>
 </form>;
}
