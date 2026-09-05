import { BellIcon, HomeIcon, LogInIcon, LogOutIcon, UserIcon, UserPlusIcon, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ModeToggle from "./ModeToggle";
import prisma from "@/lib/prisma";
import { getDbUserId, logoutUser } from "@/actions/user.action";
import SecurityBell from "./SecurityBell";

async function DesktopNavbar() {
  const userId = await getDbUserId();

  let user = null;
  try {
    user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, image: true, name: true },
        })
      : null;
  } catch (error) {
    console.error("Error fetching user for DesktopNavbar:", error);
  }

  return (
    <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
      <ModeToggle />

      <Button variant="ghost" className="flex items-center gap-2" asChild>
        <Link href="/">
          <HomeIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>
      </Button>

        <Button variant="outline" className="flex items-center gap-2 border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary transition-all shadow-[0_0_15px_rgba(var(--primary),0.1)]" asChild>
          <Link href="/simulations">
            <Bug className="w-4 h-4 animate-pulse" />
            <span className="hidden lg:inline font-bold">Threat Simulations</span>
          </Link>
        </Button>

        {user ? (
          <>
            <SecurityBell />
            
            <Button variant="ghost" className="flex items-center gap-2" asChild>
              <Link href="/notifications">
                <BellIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Notifications</span>
              </Link>
            </Button>
            
            <Button variant="ghost" className="flex items-center gap-2" asChild>
              <Link href={`/profile/${user.username}`}>
                <UserIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Profile</span>
              </Link>
            </Button>

            <form action={logoutUser}>
              <Button variant="ghost" className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50">
                <LogOutIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </form>
          </>
        ) : (
          <>
            <Button variant="outline" className="flex items-center gap-2" asChild>
              <Link href="/login">
                <LogInIcon className="w-4 h-4" />
                <span>Login</span>
              </Link>
            </Button>
            <Button variant="default" className="flex items-center gap-2" asChild>
              <Link href="/signup">
                <UserPlusIcon className="w-4 h-4" />
                <span>Sign Up</span>
              </Link>
            </Button>
          </>
        )}
    </div>
  );
}
export default DesktopNavbar;
