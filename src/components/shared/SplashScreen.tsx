
import Image from 'next/image';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex h-screen w-screen items-center justify-center bg-black">
      <div className="animate-fade-in-out">
        <Image
          src="/logo-splash.png"
          alt="BharatConnect Logo"
          width={150}
          height={150}
          priority
          data-ai-hint="logo"
        />
      </div>
    </div>
  );
}
