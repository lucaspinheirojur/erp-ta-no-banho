"use client";
import { FormEvent, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
export default function LoginPage() {
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function login(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const data=new FormData(event.currentTarget);try{const supabase=createSupabaseBrowserClient();const {error:authError}=await supabase.auth.signInWithPassword({email:String(data.get("email")),password:String(data.get("password"))});if(authError)throw authError;const response=await fetch("/api/auth/bootstrap",{method:"POST"});const result=await response.json();if(!response.ok)throw new Error(result.error||"Acesso não autorizado");window.location.assign("/");}catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível entrar.");setBusy(false);}}
  return <main className="management-login"><section><Image src="/logo-ta-no-banho.jpeg" alt="Tá no Banho" width={190} height={130} priority/><p>PAINEL DE GESTÃO</p><h1>Bem-vindo de volta</h1><span>Entre com a conta administrativa própria do Tá no Banho.</span><form onSubmit={login}><label>E-mail<input name="email" type="email" autoComplete="email" required/></label><label>Senha<input name="password" type="password" autoComplete="current-password" required/></label>{error&&<div role="alert">{error}</div>}<button disabled={busy}>{busy?"Entrando...":"Entrar no painel"}</button></form><a href="/agendar">Ir para reservas on-line</a></section></main>;
}
