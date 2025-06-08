
"use client";

import BottomNavigationBar from "@/components/bottom-navigation-bar";
import PageHeader from "@/components/page-header";
import ProfileCard from "@/components/account/ProfileCard";
import PrivacySettingsCard from "@/components/account/PrivacySettingsCard";
import ThemeSettingsCard from "@/components/account/ThemeSettingsCard";
import LanguageSettingsCard from "@/components/account/LanguageSettingsCard";
import SecuritySettingsCard from "@/components/account/SecuritySettingsCard";
import LinkedAppsCard from "@/components/account/LinkedAppsCard";
import AdvancedOptionsCard from "@/components/account/AdvancedOptionsCard";

export default function AccountPage() {
  return (
    <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background">
      <PageHeader title="Account Centre" showBackButton={false} />
      
      <main className="flex-grow overflow-y-auto pb-20 pt-4 px-4 space-y-6 hide-scrollbar">
        <ProfileCard />
        <PrivacySettingsCard />
        <ThemeSettingsCard />
        <LanguageSettingsCard />
        <SecuritySettingsCard />
        <LinkedAppsCard />
        <AdvancedOptionsCard />
      </main>
      
      <BottomNavigationBar />
    </div>
  );
}
