import type feedback from "../zh/feedback";

const en: typeof feedback = {
  common: {
    actionFailed: "Action failed. Please try again.",
    unknownError: "Something went wrong. Please try again.",
    networkError: "Network error. Check your connection and try again.",
    timeout: "Request timed out. Please try again.",
    rateLimited: "Too many requests. Please try again later.",
    sessionExpired: "Your session has expired. Please sign in again.",
    notLoggedIn: "Please sign in first.",
    forbidden: "You do not have permission to do this.",
    contentGone: "This content no longer exists.",
    requestFailed: "Request failed ({status})",
  },

  create: {
    success: "New {entity} created",
    failed: "Could not create the {entity}. Please try again.",
  },

  update: {
    success: "The {entity} has been updated",
    failed: "Could not update the {entity}. Please try again.",
  },

  delete: {
    success: "The {entity} has been deleted",
    failed: "Could not delete the {entity}. Please try again.",
  },

  toggle: {
    likeOn: "Liked",
    likeOff: "Unliked",
    favoriteOn: "Favorited",
    favoriteOff: "Unfavorited",
  },

  session: {
    loggedIn: "Signed in",
    loginFailed: "Sign in failed. Please try again.",
    registered: "Account created — please sign in",
    registerFailed: "Sign up failed. Please try again.",
    loggedOut: "Signed out",
    logoutFailed: "Sign out failed. Please try again.",
    passwordChanged: "Password updated — please sign in again",
  },

  post: {
    draftSaved: "Draft saved",
    draftUpdated: "Draft updated",
    draftRestored: "Restored your unsaved draft",
    published: "Post published",
  },

  form: {
    requiredInput: "Please enter {field}",
    tooShort: "The {field} must be at least {min} characters",
    tooLong: "The {field} must be at most {max} characters",
    format: "Invalid {field} format",
    sameAsCurrent: "The new password must be different from the current one",
    invalidField: "This field is not valid",
    imageUrl: "Enter an https image link, or a site path starting with /",
  },

  entity: {
    post: "post",
    comment: "comment",
    profile: "profile",
  },

  field: {
    title: "title",
    content: "content",
    summary: "summary",
    category: "category",
    tags: "tags",
    coverImage: "cover image",
    email: "email",
    password: "password",
    currentPassword: "current password",
    newPassword: "new password",
    firstName: "first name",
    lastName: "last name",
    username: "username",
    avatar: "avatar",
    bio: "bio",
    location: "location",
    website: "website",
  },
};

export default en;
