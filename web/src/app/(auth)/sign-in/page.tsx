"use client";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  const handleGoogleSignIn = () => {
    signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const handleDiscordSignIn = () => {
    signIn.social({
      provider: "discord",
      callbackURL: "/",
    });
  };

  const handleFacebookSignIn = () => {
    signIn.social({
      provider: "facebook",
      callbackURL: "/",
    });
  };

  const handleLineSignIn = () => {
    signIn.social({
      provider: "line",
      callbackURL: "/",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Choose your preferred sign-in method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full"
          >
            Continue with Google
          </Button>
          
          <Button
            onClick={handleDiscordSignIn}
            variant="outline"
            className="w-full"
          >
            Continue with Discord
          </Button>
          
          <Button
            onClick={handleFacebookSignIn}
            variant="outline"
            className="w-full"
          >
            Continue with Facebook
          </Button>
          
          <Button
            onClick={handleLineSignIn}
            variant="outline"
            className="w-full"
          >
            Continue with LINE
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
