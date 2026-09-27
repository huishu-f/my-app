import type { Messages } from "../zh/settings";

const settings: Messages = {
  title: "Account settings",
  subtitle: "Manage profile, password & security.",
  tabProfile: "Profile",
  tabPassword: "Password",
  firstName: "First name",
  lastName: "Last name",
  bioHint: "Up to 280 characters",
  avatarUrl: "Avatar URL",
  avatarHint: "Square 256×256 recommended",

  avatarInvalid: "Enter an https image URL, or a site-relative /path",
  bio: "Bio",
  location: "Location",
  website: "Website",
  saveChanges: "Save",
  currentPwd: "Current password",
  newPwd: "New password",
  newPwdHint: "At least 6 characters",
  confirmPwd: "Confirm new password",
  updatePwd: "Update",
  pwdTooShort: "At least 6 characters",
  pwdMismatch: "Passwords do not match",
  pwdSame: "New password must differ from the current one",
  pwdIncorrect: "Current password is incorrect",
  pwdRequired: "Current password is required",
  websiteInvalid: "Website must start with http:// or https://",
};

export default settings;
