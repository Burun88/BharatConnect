# **App Name**: BharatConnect

## Core Features:

- User Authentication Flow: Welcome, phone verification, OTP verification, and profile setup screens for new user onboarding, with error handling for invalid inputs. Profile pictures are not displayed anywhere.
- Chat List UI: Display recent chats, contact name, last message preview, timestamp, and unread message count. Differentiate Aura-enabled contacts via colored names. Avatars are non-functional.
- Chat UI: Display message bubbles, contact status, timestamps, delivery status, and a message input footer. Sending adds to local state only; no backend messaging is implemented.
- Tab Navigation: Bottom navigation bar allows users to select between 'Chats,' 'Status,' and 'Calls.' Non-active views will show placeholder content.
- Mood Aura Selection: Selection and storage of mood Auras; visually represented in the Aura bar and/or contact names and stored in localStorage, with loading skeletons.
- AI Setup: Initialization of Genkit with Google AI Gemini 2.0 Flash to prepare for potential integration of DigiLocker features.

## Style Guidelines:

- Background color: Dark grey (#121212) for a modern and sophisticated atmosphere.
- Primary color: Saturated blue (#42A5F5) to reflect trustworthiness and connectivity.
- Accent color: Vibrant violet (#AB47BC) to highlight interactive elements and the aura selection; analogous to the primary, but brighter and more saturated.
- Font: 'Inter' sans-serif throughout the application. Note: currently only Google Fonts are supported.
- Use simple, outlined icons from Lucide React for a clean, modern look.
- Use ShadCN UI components, arranging them for ease of use on mobile, taking advantage of the default Tailwind CSS styling.
- Employ subtle, smooth transitions for screen navigation and interactions, like displaying and hiding message bubbles.