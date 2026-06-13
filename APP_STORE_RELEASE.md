# APIsForge App Store Release

## App identity

- App name: `APIsForge`
- Bundle ID: `com.apisforge.app`
- Primary category: `Productivity`
- Secondary category: `Developer Tools`
- Support URL: `https://apisforge.com`
- Privacy policy URL: `https://apisforge.com/privacy`

## Build locally

1. Install the latest stable Xcode from the Mac App Store.
2. Run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
3. Run `npm run ios:sync`.
4. Run `npm run ios:open`.
5. In Xcode, select the `App` target and your Apple Developer team.
6. Confirm the bundle identifier is `com.apisforge.app`.
7. Test on a physical iPhone, then use Product > Archive.

## App Store Connect checklist

- Create a new iOS app using bundle ID `com.apisforge.app`.
- Add screenshots for 6.9-inch and 6.5-inch iPhone displays.
- Complete App Privacy answers for account data, prompts, generated content, diagnostics, and purchases.
- Add the privacy policy and support URLs.
- Complete age rating and export compliance.
- Upload the archive from Xcode Organizer.
- Add review notes and a working review account.
- Submit the build for review.

## Review notes template

APIsForge is an AI creation application that lets signed-in users generate text and images, manage generation history, and access developer API tools. Microphone access is used only when the user taps the voice input button. Camera and photo library access are used only when the user chooses to attach media.

Test account:

- Email: `[APP_REVIEW_EMAIL]`
- Password: `[APP_REVIEW_PASSWORD]`

## Required before submission

- A public privacy policy must exist at `https://apisforge.com/privacy`.
- Apple Developer Program membership must be active.
- App Store purchases must use Apple In-App Purchase. Do not expose external digital subscription purchase buttons inside the iOS app until StoreKit is implemented.
