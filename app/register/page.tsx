"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage(){
 const router=useRouter();
 const [username,setUsername]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   const supabase=createClient();
   const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{username:username.trim(),display_name:username.trim()},emailRedirectTo:`${window.location.origin}/dashboard`}});
   if(error){
    const msg=error.message.toLowerCase();
    if(msg.includes("email rate limit")||msg.includes("over_email_send_rate_limit"))throw new Error("Supabase has temporarily blocked registration emails because its email sending limit has been reached. The administrator must turn off email confirmation or configure a custom SMTP provider in Supabase Auth before new users can register.");
    if(msg.includes("already registered")||msg.includes("already been registered"))throw new Error("An account with this email already exists. Please sign in instead.");
    throw error;
   }
   if(data.session){router.replace("/dashboard");router.refresh();return;}
   setMessage("Your account request was received. Check your inbox to confirm your email, then sign in. If no confirmation email arrives, the site administrator must check the Supabase email settings.");
  }catch(error){setMessage(error instanceof Error?error.message:"Unable to create account.");}
  finally{setBusy(false);}
 }
 return <main className="flex min-h-screen items-center justify-center px-5 py-12"><section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101a2a] p-8"><Link href="/" className="text-xs font-semibold tracking-[.18em] text-blue-300">INTERMARKET STRATEGIST</Link><h1 className="mt-6 text-2xl font-semibold">Create your journal</h1><p className="mt-2 text-sm text-slate-400">Your trading records are private to your account.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm text-slate-300">Username<input required minLength={3} maxLength={30} value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400"/></label><label className="block text-sm text-slate-300">Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400"/></label><label className="block text-sm text-slate-300">Password<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-lg border border-white/10 bg-[#080e19] px-3 py-3 outline-none focus:border-blue-400"/><span className="mt-1 block text-xs text-slate-500">Use at least 8 characters.</span></label><button disabled={busy} className="w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?"Creating account…":"Create account"}</button></form>{message&&<p role="status" className="mt-4 break-words text-sm text-slate-300">{message}</p>}<p className="mt-6 text-sm text-slate-400">Already registered? <Link href="/login" className="text-blue-300 hover:text-blue-200">Sign in</Link></p></section></main>;
}
