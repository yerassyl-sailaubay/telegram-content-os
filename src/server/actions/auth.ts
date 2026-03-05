"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm-password") as string;

  // Check if passwords match
  if (password !== confirmPassword) {
    redirect(`/signup?error=${encodeURIComponent("Passwords do not match")}`);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log("[Signup] Result:", { user: !!data.user, error: error?.message });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // Create user in local database if signup succeeded
  if (data.user) {
    try {
      await db.insert(users).values({
        id: data.user.id,
        email: data.user.email ?? email,
        name: null,
        locale: "en",
      });
      console.log("[Signup] Local user created:", data.user.id);
    } catch (dbError) {
      console.error("[Signup] Failed to create local user:", dbError);
      // Don't block the signup flow - auth user is already created
    }
  }

  // After signup, redirect to login with a success message
  // (email confirmation may be required depending on Supabase settings)
  redirect("/login?message=Check your email to confirm your account");
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

export async function signInWithOAuth(provider: "google" | "github") {
  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://${process.env.VERCEL_URL}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}
